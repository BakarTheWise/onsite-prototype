import Link from "next/link";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/workspace/project-card";
import { getServerSession } from "@/lib/server-session";
import { getVisibleProjects } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getServerSession();
  if (!session) return null;
  const projects = await getVisibleProjects(session.user.id);

  return (
    <div className="page-stack">
      <section className="page-heading page-heading-row">
        <div><p className="eyebrow">PROJECT CONTROL</p><h1>Projects</h1><p className="muted">Only workspaces you are a member of appear here.</p></div>
        <Link className="button button-dark" href="/workspace/projects/new"><Plus size={16} /> New project</Link>
      </section>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-icon"><Plus size={22} /></span>
          <h2>Start your first project</h2>
          <p>Set up a project workspace and invite its team when you&apos;re ready.</p>
          <Link className="button button-dark" href="/workspace/projects/new">Create project</Link>
        </section>
      )}
    </div>
  );
}
