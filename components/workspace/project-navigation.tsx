"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canViewProjectSection } from "@/lib/project-permissions";

const sections = [
  { path: "", label: "Overview" },
  { path: "/dependencies", label: "Plan" },
  { path: "/tasks", label: "Tasks" },
  { path: "/site", label: "Site diary" },
  { path: "/materials", label: "Materials" },
  { path: "/money", label: "Money" },
  { path: "/team", label: "People" },
  { path: "/documents", label: "Documents" },
  { path: "/vendors", label: "Vendors" },
  { path: "/zones", label: "Zone map" }
];

export function ProjectNavigation({ projectId, role }: { projectId: string; role: string }) {
  const pathname = usePathname();
  const base = `/workspace/projects/${projectId}`;

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {sections.filter(({ path }) => canViewProjectSection(role, path ? path.slice(1) : "overview")).map(({ path, label }) => {
        const href = `${base}${path}`;
        const active = path
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === base;
        return (
          <Link className={active ? "project-tab active" : "project-tab"} href={href} key={label}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
