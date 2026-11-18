import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planCatalog } from "@/lib/plans";
import { canViewProjectSection } from "@/lib/project-permissions";
import { projectCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in to view projects." } },
      { status: 401 }
    );
  }

  const memberships = await prisma.projectMember.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      project: {
        company: {
          members: { none: { userId: session.user.id, status: "SUSPENDED" } }
        }
      }
    },
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          location: true,
          status: true,
          budgetNaira: true,
          startDate: true,
          targetEnd: true,
          updatedAt: true
        }
      }
    },
    orderBy: { project: { updatedAt: "desc" } }
  });

  return NextResponse.json({
    projects: memberships.map(({ role, project }) => ({
      role,
      project: {
        ...project,
        budgetNaira: canViewProjectSection(role, "money") ? project.budgetNaira : null
      }
    }))
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in to create a project." } },
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

  const parsed = projectCreateSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Check the project details." } },
      { status: 400 }
    );
  }

  const membership = await prisma.companyMember.findFirst({
    where: {
      companyId: parsed.data.companyId,
      userId: session.user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN", "PROJECT_MANAGER"] }
    },
    select: { id: true, companyId: true, role: true }
  });
  if (!membership) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You cannot create projects for this company." } },
      { status: 403 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: membership.companyId },
    select: {
      subscription: { select: { plan: true, extraProjects: true, status: true, trialEndsAt: true } },
      _count: { select: { projects: { where: { status: { not: "ARCHIVED" } } } } }
    }
  });
  if (!company?.subscription) {
    return NextResponse.json(
      { error: { code: "SUBSCRIPTION_MISSING", message: "This company does not have a plan. Contact OnSite support." } },
      { status: 409 }
    );
  }
  const subscription = company.subscription;
  const trialActive = subscription.status === "TRIALING" && subscription.trialEndsAt > new Date();
  if (subscription.status !== "ACTIVE" && !trialActive) {
    return NextResponse.json(
      { error: { code: "SUBSCRIPTION_INACTIVE", message: "The free trial has ended. Contact your account owner to continue." } },
      { status: 402 }
    );
  }
  const planProjectLimit = planCatalog[subscription.plan].maxProjects;
  if (planProjectLimit !== null && company._count.projects >= planProjectLimit + subscription.extraProjects) {
    return NextResponse.json(
      { error: { code: "PROJECT_LIMIT", message: "Your current plan has reached its project limit." } },
      { status: 403 }
    );
  }

  const project = await prisma.$transaction(async (transaction) => {
    const created = await transaction.project.create({
      data: {
        companyId: membership.companyId,
        name: parsed.data.name,
        location: parsed.data.location,
        budgetNaira: parsed.data.budgetNaira,
        members: {
          create: {
            userId: session.user.id,
            role: membership.role === "OWNER" ? "OWNER" : "PROJECT_LEAD"
          }
        }
      },
      select: { id: true, name: true, status: true }
    });
    await transaction.auditEvent.create({
      data: {
        companyId: membership.companyId,
        actorId: session.user.id,
        entityType: "Project",
        entityId: created.id,
        action: "project.created"
      }
    });
    return created;
  });

  return NextResponse.json({ project }, { status: 201 });
}
