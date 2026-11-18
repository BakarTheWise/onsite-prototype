import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePlanPrice } from "@/lib/plans";
import { companySetupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
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

  const parsed = companySetupSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Check the company and project details." } },
      { status: 400 }
    );
  }

  const { projectName, location, budgetNaira, plan, billingInterval, staffCount, extraProjects } = parsed.data;
  const price = calculatePlanPrice(plan, billingInterval, extraProjects);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const companyName = parsed.data.companyName || "Personal workspace";

  const companyId = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${session.user.id}::uuid FOR UPDATE`;

    const existingMembership = await transaction.companyMember.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { id: true }
    });
    if (existingMembership) return null;

    const createdCompany = await transaction.company.create({
      data: {
        name: companyName,
        subscription: {
          create: {
            plan,
            billingInterval,
            status: "TRIALING",
            staffCount,
            extraProjects: price.billableExtraProjects,
            planAmountNaira: price.planAmount,
            extraProjectsAmountNaira: price.extraProjectAmount,
            vatAmountNaira: price.vatAmount,
            trialStartsAt: now,
            trialEndsAt
          }
        },
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER"
          }
        },
        projects: {
          create: {
            name: projectName,
            location,
            budgetNaira,
            status: "PLANNING",
            members: {
              create: {
                userId: session.user.id,
                role: "OWNER"
              }
            }
          }
        }
      },
      select: { id: true }
    });

    await transaction.auditEvent.create({
      data: {
        companyId: createdCompany.id,
        actorId: session.user.id,
        entityType: "Company",
        entityId: createdCompany.id,
        action: "company.created"
      }
    });

    return createdCompany.id;
  });

  if (!companyId) {
    return NextResponse.json(
      { error: { code: "COMPANY_ALREADY_CREATED", message: "Your account already belongs to a company." } },
      { status: 409 }
    );
  }

  return NextResponse.json({ companyId }, { status: 201 });
}
