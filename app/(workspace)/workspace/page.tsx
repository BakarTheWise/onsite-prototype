import Link from "next/link";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import { ProjectCard } from "@/components/workspace/project-card";
import { getServerSession } from "@/lib/server-session";
import { getVisibleProjects } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function WorkspaceHomePage() {
  const session = await getServerSession();
  if (!session) return null;
  const projects = await getVisibleProjects(session.user.id);

  return (
    <div className="page-stack">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">PROJECT OVERVIEW</p>
          <h1>Good to have you back, {session.user.name.split(" ")[0]}.</h1>
          <p className="muted">Your active workspaces and project updates are in one place.</p>
        </div>
        <Link className="button button-dark" href="/workspace/projects/new"><Plus size={16} /> New project</Link>
      </section>

      <section className="metric-grid" aria-label="Workspace summary">
        <article className="metric-card"><span>Projects</span><strong>{projects.length}</strong><small>Workspaces you can access</small></article>
        <article className="metric-card"><span>Active</span><strong>{projects.filter((project) => project.status === "ACTIVE").length}</strong><small>Currently underway</small></article>
        <article className="metric-card"><span>Tasks</span><strong>{projects.reduce((total, project) => total + project.taskCount, 0)}</strong><small>Across your projects</small></article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">YOUR WORK</p><h2>Projects</h2></div>
          {projects.length > 0 && <Link className="text-link" href="/workspace/projects">View all <ArrowRight size={14} /></Link>}
        </div>
        {projects.length ? (
          <div className="project-grid">
            {projects.slice(0, 6).map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><FolderKanban size={22} /></span>
            <h3>No projects yet</h3>
            <p>Create your first project to connect its plan, team and site records.</p>
            <Link className="button button-dark" href="/workspace/projects/new">Create a project <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>
    </div>
  );
}
