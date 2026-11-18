import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { planCatalog } from "@/lib/plans";
import { invitationCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in to invite a team member." } },
      { status: 401 }
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "The request body must be valid JSON." } },
        { status: 400 }
      );
    }
    throw error;
  }

  const parsed = invitationCreateSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Check the invitation details." } },
      { status: 400 }
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      AND: [{
        company: {
          members: {
            none: { userId: session.user.id, status: "SUSPENDED" }
          }
        }
      }],
      OR: [
        {
          company: {
            members: {
              some: {
                userId: session.user.id,
                status: "ACTIVE",
                role: { in: ["OWNER", "ADMIN", "PROJECT_MANAGER"] }
              }
            }
          }
        },
        {
          members: {
            some: {
              userId: session.user.id,
              status: "ACTIVE",
              role: { in: ["OWNER", "PROJECT_LEAD"] }
            }
          }
        }
      ]
    },
    select: { id: true, companyId: true, name: true }
  });
  if (!project) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You cannot invite members to this project." } },
      { status: 403 }
    );
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      projectId: project.id,
      email: parsed.data.email,
      acceptedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: { id: true }
  });
  if (existingInvitation) {
    return NextResponse.json(
      { error: { code: "INVITATION_PENDING", message: "An active invitation already exists for that address." } },
      { status: 409 }
    );
  }

  if (parsed.data.projectRole !== "VENDOR") {
    const company = await prisma.company.findUnique({
      where: { id: project.companyId },
      select: { subscription: { select: { plan: true, status: true, trialEndsAt: true } } }
    });
    const subscription = company?.subscription;
    if (!subscription) {
      return NextResponse.json(
        { error: { code: "SUBSCRIPTION_MISSING", message: "This company does not have a plan. Contact OnSite support." } },
        { status: 409 }
      );
    }
    const trialActive = subscription.status === "TRIALING" && subscription.trialEndsAt > new Date();
    if (subscription.status !== "ACTIVE" && !trialActive) {
      return NextResponse.json(
        { error: { code: "SUBSCRIPTION_INACTIVE", message: "The free trial has ended. Contact your account owner to continue." } },
        { status: 402 }
      );
    }

    const [activeMembers, pendingInvitations] = await Promise.all([
      prisma.projectMember.findMany({
        where: {
          status: "ACTIVE",
          role: { notIn: ["OWNER", "VENDOR"] },
          project: { companyId: project.companyId }
        },
        distinct: ["userId"],
        select: { user: { select: { email: true } } }
      }),
      prisma.invitation.findMany({
        where: {
          companyId: project.companyId,
          projectRole: { not: "VENDOR" },
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        },
        distinct: ["email"],
        select: { email: true }
      })
    ]);
    const activeEmails = new Set(activeMembers.map(({ user }) => user.email.toLowerCase()));
    const pendingEmails = new Set(pendingInvitations.map(({ email }) => email.toLowerCase()));
    const reservedPendingSeats = [...pendingEmails].filter((email) => !activeEmails.has(email)).length;
    const addsSeat = activeEmails.has(parsed.data.email) || pendingEmails.has(parsed.data.email) ? 0 : 1;
    const totalSeats = activeEmails.size + reservedPendingSeats + addsSeat;
    if (totalSeats > planCatalog[subscription.plan].maxStaff) {
      return NextResponse.json(
        { error: { code: "STAFF_LIMIT", message: "Your plan has reached its staff limit. Upgrade your plan to invite another user." } },
        { status: 403 }
      );
    }
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.$transaction(async (transaction) => {
    const created = await transaction.invitation.create({
      data: {
        companyId: project.companyId,
        projectId: project.id,
        email: parsed.data.email,
        tokenHash,
        projectRole: parsed.data.projectRole,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      select: { id: true }
    });
    await transaction.auditEvent.create({
      data: {
        companyId: project.companyId,
        actorId: session.user.id,
        entityType: "Invitation",
        entityId: created.id,
        action: "invitation.created"
      }
    });
    return created;
  });

  const inviteUrl = `${process.env.APP_ORIGIN ?? "http://localhost:3000"}/join?token=${token}`;
  try {
    await sendTransactionalEmail({
      to: parsed.data.email,
      subject: `Invitation to ${project.name} on OnSite`,
      text: `You have been invited to join ${project.name} as ${parsed.data.projectRole.replaceAll("_", " ")}. Sign in or create an account with this email address to accept the invitation. This link expires in 7 days:\n\n${inviteUrl}`
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.auditEvent.deleteMany({ where: { entityId: invitation.id, entityType: "Invitation" } }),
      prisma.invitation.delete({ where: { id: invitation.id } })
    ]);
    console.error("Could not deliver a project invitation", { invitationId: invitation.id, error });
    return NextResponse.json(
      { error: { code: "EMAIL_DELIVERY_FAILED", message: "The invitation could not be sent. Check email settings and try again." } },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: "sent" }, { status: 201 });
}
