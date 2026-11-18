"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Building2, ChartNoAxesCombined, ClipboardList, CreditCard, FileText, FolderKanban,
  GitBranch, Map, Package, ShieldCheck, Truck, Users, Wallet, LogOut, Settings
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { canViewProjectSection } from "@/lib/project-permissions";

const sidebarProjectSections = new Set(["tasks", "materials", "money", "vendors", "team"]);

export function WorkspaceShell({
  children,
  user,
  companyName,
  projectMemberships
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  companyName: string;
  projectMemberships: { projectId: string; role: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const projectId = pathname.match(/\/workspace\/projects\/([0-9a-f-]{36})/i)?.[1];
  const projectBase = projectId ? `/workspace/projects/${projectId}` : "/workspace/projects";
  const projectRole = projectMemberships.find((membership) => membership.projectId === projectId)?.role;
  const projectLinks = [
    { section: "tasks", href: `${projectBase}/tasks`, title: "Tasks", icon: ClipboardList },
    { section: "materials", href: `${projectBase}/materials`, title: "Materials", icon: Package },
    { section: "money", href: `${projectBase}/money`, title: "Money", icon: Wallet },
    { section: "vendors", href: `${projectBase}/vendors`, title: "Vendors", icon: Truck },
    { section: "site", href: `${projectBase}/site`, title: "Site", icon: ShieldCheck },
    { section: "gate-log", href: `${projectBase}/gate-log`, title: "Gate log", icon: GitBranch },
    { section: "zones", href: `${projectBase}/zones`, title: "Zone map", icon: Map },
    { section: "documents", href: `${projectBase}/documents`, title: "Documents", icon: FileText },
    { section: "team", href: `${projectBase}/team`, title: "Team", icon: Users },
    { section: "dependencies", href: `${projectBase}/dependencies`, title: "Plan", icon: ChartNoAxesCombined }
  ];
  const navigation = [
    { href: "/workspace", title: "Home", icon: ChartNoAxesCombined },
    { href: "/workspace/projects", title: "Projects", icon: FolderKanban },
    ...(projectId && projectRole
      ? projectLinks.filter(({ section }) => sidebarProjectSections.has(section) && canViewProjectSection(projectRole, section))
      : []),
    { href: "/workspace/billing", title: "Plan & billing", icon: CreditCard },
    { href: "/account", title: "Account security", icon: Settings }
  ];
  const mobileNavigation = projectId
    ? [navigation[0], navigation[1], ...navigation.slice(2, 5)]
    : [navigation[0], navigation[1], navigation[2]];
  const isActive = (href: string) => {
    if (href === "/workspace/projects") {
      return pathname === href || /^\/workspace\/projects\/[^/]+$/.test(pathname);
    }
    return href === pathname || (href !== "/workspace" && pathname.startsWith(`${href}/`));
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        console.error("OnSite could not register its offline fallback.");
      });
    }
  }, []);

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="workspace-frame">
      <aside className="workspace-sidebar">
        <Link className="brand brand-light" href="/workspace">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>OnSite</span>
        </Link>
        <div className="sidebar-company">
          <strong><Building2 size={14} />{companyName}</strong>
        </div>
        <nav className="sidebar-navigation" aria-label="Workspace navigation">
          <span className="nav-caption">ONSITE</span>
          {navigation.map(({ href, title, icon: Icon }) => (
            <Link
              className={isActive(href) ? "workspace-nav active" : "workspace-nav"}
              href={href}
              key={title}
            >
              <Icon size={17} />{title}
            </Link>
          ))}
        </nav>
        <div className="sidebar-profile">
          <div className="profile-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="profile-copy"><strong>{user.name}</strong><small>{user.email}</small></div>
          <button className="icon-button" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header">
          <div>
            <span className="mobile-brand"><span className="brand-mark" aria-hidden="true">O</span> OnSite</span>
            <span className="header-company">{companyName}</span>
          </div>
          <div className="header-actions">
            <span className="secure-label"><span /> Secure workspace</span>
            <button className="icon-button" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </header>
        <main className="workspace-content">{children}</main>
        <nav className="mobile-navigation" aria-label="Mobile workspace navigation">
          {mobileNavigation.map(({ href, title, icon: Icon }) => (
            <Link
              className={isActive(href) ? "mobile-nav-link active" : "mobile-nav-link"}
              href={href}
              key={title}
            >
              <Icon size={18} /><span>{title}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
