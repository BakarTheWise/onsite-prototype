import { notFound } from "next/navigation";
import { ProjectInviteForm } from "@/components/workspace/project-invite-form";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InviteProjectMemberPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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
    select: { id: true, name: true }
  });
  if (!project) notFound();

  return <ProjectInviteForm projectId={project.id} projectName={project.name} />;
}
