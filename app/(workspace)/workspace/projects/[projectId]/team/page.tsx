import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { getProjectMembership } from "@/lib/project-access";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectTeamPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  const { projectId } = await params;
  const membership = await getProjectMembership(session.user.id, projectId);
  if (!membership) notFound();
  if (!["OWNER", "PROJECT_LEAD"].includes(membership.role)) {
    return (
      <section className="empty-state">
        <h1>Team roster restricted</h1>
        <p>Only project owners and leads can view the full team directory.</p>
        <Link className="button button-outline" href={`/workspace/projects/${projectId}`}>Return to project</Link>
      </section>
    );
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId, status: "ACTIVE" },
    select: { role: true, joinedAt: true, user: { select: { name: true, email: true } } },
    orderBy: { joinedAt: "asc" }
  });
  const canInvite = ["OWNER", "PROJECT_LEAD"].includes(membership.role);

  return (
    <div className="page-stack">
      <Link className="back-link" href={`/workspace/projects/${projectId}`}><ArrowLeft size={15} /> Project home</Link>
      <section className="page-heading page-heading-row">
        <div><p className="eyebrow">PROJECT TEAM</p><h1>{membership.project.name}</h1><p className="muted">Only assigned, active project members can see this team.</p></div>
        {canInvite && <Link className="button button-dark" href={`/workspace/projects/${projectId}/team/invite`}><UserPlus size={16} /> Invite teammate</Link>}
      </section>
      <section className="panel team-list">
        {members.map(({ role, joinedAt, user }) => (
          <div className="team-row" key={user.email}>
            <span className="profile-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="team-person"><strong>{user.name}</strong><small>{user.email}</small></span>
            <span className="team-role">{role.replaceAll("_", " ")}</span>
            <time dateTime={joinedAt.toISOString()}>{joinedAt.toLocaleDateString()}</time>
          </div>
        ))}
        {!members.length && <div className="empty-state"><h2>No active members</h2><p>Invite a teammate to start building this project team.</p></div>}
      </section>
    </div>
  );
}
