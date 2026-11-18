import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invitationAcceptSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in with the invited email address." } },
      { status: 401 }
    );
  }
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: { code: "EMAIL_NOT_VERIFIED", message: "Verify your email before accepting an invitation." } },
      { status: 403 }
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

  const parsed = invitationAcceptSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INVITATION", message: "This invitation link is invalid or expired." } },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const now = new Date();
  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash, acceptedAt: null, expiresAt: { gt: now } },
    select: {
      id: true,
      companyId: true,
      projectId: true,
      email: true,
      projectRole: true
    }
  });
  const projectId = invitation?.projectId;
  const projectRole = invitation?.projectRole;
  if (!invitation || !projectId || !projectRole) {
    return NextResponse.json(
      { error: { code: "INVALID_INVITATION", message: "This invitation link is invalid or expired." } },
      { status: 404 }
    );
  }
  if (invitation.email !== session.user.email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: { code: "INVITATION_EMAIL_MISMATCH", message: "Sign in with the email address that received this invitation." } },
      { status: 403 }
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${session.user.id}::uuid FOR UPDATE`;

    const companyMember = await transaction.companyMember.findUnique({
      where: { companyId_userId: { companyId: invitation.companyId, userId: session.user.id } },
      select: { status: true }
    });
    if (companyMember && companyMember.status !== "ACTIVE") return "MEMBERSHIP_SUSPENDED";

    if (projectRole !== "VENDOR") {
      const activeCompanyMember = await transaction.companyMember.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        select: { companyId: true }
      });
      if (activeCompanyMember && activeCompanyMember.companyId !== invitation.companyId) {
        return "COMPANY_ALREADY_ASSIGNED";
      }
    }

    const projectMember = await transaction.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
      select: { status: true }
    });
    if (projectMember && projectMember.status !== "ACTIVE") return "MEMBERSHIP_SUSPENDED";

    const accepted = await transaction.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now }
    });
    if (accepted.count !== 1) return "INVITATION_ALREADY_USED";

    if (!companyMember && projectRole !== "VENDOR") {
      await transaction.companyMember.create({
        data: {
          companyId: invitation.companyId,
          userId: session.user.id,
          role: "TEAM_MEMBER"
        }
      });
    }
    if (!projectMember) {
      await transaction.projectMember.create({
        data: {
          projectId,
          userId: session.user.id,
          role: projectRole
        }
      });
    }

    await transaction.auditEvent.create({
      data: {
        companyId: invitation.companyId,
        actorId: session.user.id,
        entityType: "Invitation",
        entityId: invitation.id,
        action: "invitation.accepted"
      }
    });
    return "ACCEPTED";
  });

  if (result !== "ACCEPTED") {
    const message = result === "MEMBERSHIP_SUSPENDED"
      ? "Your company access is suspended. Contact a company administrator."
      : result === "COMPANY_ALREADY_ASSIGNED"
        ? "This account already belongs to another company. Ask the company administrator to use a separate account."
        : "This invitation has already been used.";
    return NextResponse.json(
      { error: { code: result, message } },
      { status: 409 }
    );
  }

  return NextResponse.json({ status: "accepted" });
}
