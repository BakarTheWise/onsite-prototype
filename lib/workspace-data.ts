import "server-only";

import { prisma } from "@/lib/prisma";
import { canViewProjectSection } from "@/lib/project-permissions";

export async function getVisibleProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: {
      userId,
      status: "ACTIVE",
      project: {
        company: {
          members: { none: { userId, status: "SUSPENDED" } }
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
          updatedAt: true,
          _count: { select: { tasks: true } }
        }
      }
    },
    orderBy: { project: { updatedAt: "desc" } }
  });

  return memberships.map(({ role, project }) => ({
    id: project.id,
    name: project.name,
    location: project.location,
    status: project.status,
    budgetNaira: canViewProjectSection(role, "money") ? project.budgetNaira?.toString() ?? null : null,
    role,
    taskCount: project._count.tasks
  }));
}
