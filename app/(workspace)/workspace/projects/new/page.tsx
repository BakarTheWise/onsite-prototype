import { redirect } from "next/navigation";
import { ProjectCreateForm } from "@/components/workspace/project-create-form";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const membership = await prisma.companyMember.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN", "PROJECT_MANAGER"] }
    },
    orderBy: { joinedAt: "asc" },
    select: { companyId: true }
  });
  if (!membership) {
    return (
      <section className="empty-state">
        <h1>Project creation is restricted</h1>
        <p>Ask a company owner or administrator to create a project.</p>
      </section>
    );
  }

  return <ProjectCreateForm companyId={membership.companyId} />;
}
