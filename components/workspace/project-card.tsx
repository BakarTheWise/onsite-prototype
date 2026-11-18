import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

const statusNames: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived"
};

export function ProjectCard({
  project
}: {
  project: {
    id: string;
    name: string;
    location: string | null;
    status: ProjectStatus;
    budgetNaira: string | null;
    role: string;
    taskCount: number;
  };
}) {
  return (
    <Link className="project-card" href={`/workspace/projects/${project.id}`}>
      <div className="project-card-top">
        <span className={`status-chip status-${project.status.toLowerCase()}`}>{statusNames[project.status]}</span>
        <ArrowUpRight size={17} className="project-card-arrow" />
      </div>
      <h3>{project.name}</h3>
      <p className="project-location"><MapPin size={14} />{project.location || "Site location not added"}</p>
      <div className="project-card-bottom">
        <span>{project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}</span>
        <span>{project.budgetNaira ? `₦${Number(project.budgetNaira).toLocaleString("en-NG")}` : project.role.replaceAll("_", " ")}</span>
      </div>
    </Link>
  );
}
