import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { ProjectNavigation } from "@/components/workspace/project-navigation";
import { getServerSession } from "@/lib/server-session";
import { getProjectMembership } from "@/lib/project-access";
import { canViewProjectSection } from "@/lib/project-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value)}`;
}

export default async function ProjectHomePage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { projectId } = await params;
  const membership = await getProjectMembership(session.user.id, projectId);
  if (!membership) notFound();

  const { project } = membership;
  if (membership.role === "VENDOR") {
    return (
      <div className="page-stack">
        <ProjectNavigation projectId={project.id} role={membership.role} />
        <section className="page-heading">
          <p className="eyebrow">SUPPLIER WORKSPACE</p>
          <h1>{project.name}</h1>
          <p className="muted">You have access to this project as an invited supplier.</p>
        </section>
        <div className="notice">
          <strong>Orders and invoices are not available yet</strong>
          <span>Your account cannot see the project team, site activity, budget, or other suppliers. Order confirmations and invoice tracking will be enabled after the supplier workflow and payment integration are configured.</span>
        </div>
      </div>
    );
  }

  const canViewFinance = ["OWNER", "PROJECT_LEAD", "QUANTITY_SURVEYOR", "ACCOUNTANT"].includes(membership.role);
  const canViewApprovals = ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER"].includes(membership.role);
  const [tasks, stages, logs, blockedCount, overdueCount, pendingApprovals] = await Promise.all([
    prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true, status: true, dueAt: true },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: 8
    }),
    prisma.stage.findMany({
      where: { projectId },
      select: { id: true, name: true, startsAt: true, targetEnd: true, _count: { select: { tasks: true } } },
      orderBy: { position: "asc" }
    }),
    prisma.dailyLog.findMany({
      where: { projectId },
      select: { id: true, logDate: true, workDone: true, author: { select: { name: true } } },
      orderBy: { logDate: "desc" },
      take: 4
    }),
    prisma.task.count({ where: { projectId, status: "BLOCKED" } }),
    prisma.task.count({ where: { projectId, dueAt: { lt: new Date() }, status: { not: "DONE" } } }),
    canViewApprovals ? prisma.approval.count({ where: { projectId, status: "PENDING" } }) : Promise.resolve(0)
  ]);

  const cashOut = canViewFinance ? await prisma.siteCashTransaction.aggregate({
    where: { projectId, direction: "OUT" },
    _sum: { amount: true }
  }) : null;
  const totalTasks = await prisma.task.count({ where: { projectId } });
  const completedTasks = await prisma.task.count({ where: { projectId, status: "DONE" } });
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const attention = [
    blockedCount ? `${blockedCount} blocked task${blockedCount === 1 ? "" : "s"}` : null,
    overdueCount ? `${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}` : null,
    pendingApprovals ? `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} waiting` : null
  ].filter((item): item is string => item !== null);

  return (
    <div className="page-stack">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">PROJECT HOME · {membership.role.replaceAll("_", " ")}</p>
          <h1>{project.name}</h1>
          <p className="project-location"><MapPin size={14} />{project.location || "Site location not added"}</p>
        </div>
        <div className="project-actions">
          {["OWNER", "PROJECT_LEAD"].includes(membership.role) && <Link className="button button-outline" href={`/workspace/projects/${project.id}/team`}>Project team</Link>}
          {["OWNER", "PROJECT_LEAD"].includes(membership.role) && (
            <Link className="button button-dark" href={`/workspace/projects/${project.id}/tasks`}><Plus size={15} /> Add task</Link>
          )}
        </div>
      </section>

      <ProjectNavigation projectId={project.id} role={membership.role} />

      <section className={canViewFinance ? "metric-grid metric-grid-four" : "metric-grid"} aria-label="Project summary">
        <article className="metric-card"><span>Progress</span><strong>{progress}%</strong><small>{completedTasks} of {totalTasks} tasks complete</small></article>
        {canViewFinance && <article className="metric-card"><span>Cash spent</span><strong>{money(Number(cashOut?._sum.amount ?? 0))}</strong><small>Recorded site cash outflow</small></article>}
        <article className="metric-card"><span>Schedule</span><strong>{overdueCount ? `${overdueCount} late` : "On track"}</strong><small>{project.targetEnd ? `Target ${project.targetEnd.toLocaleDateString()}` : "Target date not set"}</small></article>
        <article className="metric-card"><span>Open tasks</span><strong>{totalTasks - completedTasks}</strong><small>{blockedCount} blocked · {pendingApprovals} approvals</small></article>
      </section>

      <section className="module-grid">
        <article className="module-card module-card-wide">
          <div className="section-heading">
            <div><p className="eyebrow">PROJECT PLAN</p><h2>Stages and tasks</h2></div>
            {canViewProjectSection(membership.role, "dependencies") && <Link className="text-link" href={`/workspace/projects/${project.id}/dependencies`}>View plan <ArrowRight size={14} /></Link>}
          </div>
          {stages.length ? (
            <div className="module-list">
              {stages.map((stage, index) => (
                <div className="module-list-row" key={stage.id}>
                  <div><strong>{stage.name}</strong><small>{stage._count.tasks} tasks · {stage.startsAt?.toLocaleDateString() ?? "Start date not set"}</small></div>
                  <small>{stage.targetEnd?.toLocaleDateString() ?? `Stage ${index + 1}`}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><h3>No stages yet</h3><p>Break the project into stages to track schedule and dependencies.</p>{canViewProjectSection(membership.role, "dependencies") && <Link className="button button-dark" href={`/workspace/projects/${project.id}/dependencies`}>Set up plan</Link>}</div>
          )}
        </article>

        <article className="module-card">
          <p className="eyebrow">NEEDS ATTENTION</p>
          {attention.length ? (
            <div className="module-list">
              {attention.map((item) => <div className="module-list-row" key={item}><strong>{item}</strong><span className="status-chip">Review</span></div>)}
            </div>
          ) : <p className="muted">No blocked tasks, overdue work, or pending approvals.</p>}
        </article>

        <article className="module-card">
          <p className="eyebrow">UPCOMING TASKS</p>
          {tasks.length ? (
            <div className="module-list">
              {tasks.slice(0, 5).map((task) => (
                <div className="module-list-row" key={task.id}>
                  <div><strong>{task.title}</strong><small>{task.dueAt ? `Due ${task.dueAt.toLocaleDateString()}` : "No due date"}</small></div>
                  <span className="status-chip">{task.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          ) : <p className="muted">Add tasks to assign owners and track progress.</p>}
          <Link className="text-link" href={`/workspace/projects/${project.id}/tasks`}>Open tasks <ArrowRight size={14} /></Link>
        </article>

        <article className="module-card module-card-wide">
          <div className="section-heading">
            <div><p className="eyebrow">SITE DIARY</p><h2>Latest activity</h2></div>
            <Link className="text-link" href={`/workspace/projects/${project.id}/site`}>Open site diary <ArrowRight size={14} /></Link>
          </div>
          {logs.length ? (
            <div className="module-list">
              {logs.map((log) => (
                <div className="module-list-row" key={log.id}>
                  <div><strong>{log.workDone}</strong><small>Reported by {log.author.name}</small></div>
                  <small>{log.logDate.toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          ) : <p className="muted">Daily site reports will appear here.</p>}
        </article>
      </section>

      <section className={canViewFinance ? "project-facts" : "project-facts project-facts-single"}>
        <article className="fact-card"><span><CalendarDays size={16} /> Project dates</span><strong>{project.startDate ? project.startDate.toLocaleDateString() : "Not scheduled"}</strong><small>Target finish {project.targetEnd ? project.targetEnd.toLocaleDateString() : "not set"}</small></article>
        {canViewFinance && <article className="fact-card"><span><Wallet size={16} /> Project budget</span><strong>{project.budgetNaira ? money(Number(project.budgetNaira)) : "Not set"}</strong><small>Budget and commitments</small></article>}
      </section>
    </div>
  );
}
