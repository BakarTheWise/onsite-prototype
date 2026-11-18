import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    select: { company: { select: { name: true } } }
  });
  const projectMemberships = await prisma.projectMember.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      project: { company: { members: { none: { userId: session.user.id, status: "SUSPENDED" } } } }
    },
    select: { projectId: true, role: true }
  });
  let companyName = membership?.company.name;
  if (!membership) {
    if (!projectMemberships.length) redirect("/onboarding");
    companyName = "Project access";
  }

  return (
    <WorkspaceShell
      user={{ name: session.user.name, email: session.user.email }}
      companyName={companyName ?? "Project access"}
      projectMemberships={projectMemberships}
    >
      {children}
    </WorkspaceShell>
  );
}
