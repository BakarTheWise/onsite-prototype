import "server-only";

import { prisma } from "@/lib/prisma";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getProjectMembership(userId: string, projectId: string) {
  if (!isUuid(userId) || !isUuid(projectId)) return null;

  return prisma.projectMember.findFirst({
    where: {
      userId,
      projectId,
      status: "ACTIVE",
      project: {
        company: {
          members: { none: { userId, status: "SUSPENDED" } }
        }
      }
    },
    select: {
      id: true,
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          companyId: true,
          location: true,
          status: true,
          budgetNaira: true,
          startDate: true,
          targetEnd: true
        }
      }
    }
  });
}
