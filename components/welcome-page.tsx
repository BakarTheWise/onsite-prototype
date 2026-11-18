import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, Construction, HardHat, Truck } from "lucide-react";

const audiences = [
  { title: "I own or fund a project", subtitle: "Owner, client, investor", icon: BriefcaseBusiness },
  { title: "I run a construction company", subtitle: "MD, director", icon: Building2 },
  { title: "I'm on a project team", subtitle: "Manager, engineer, QS, accounts", icon: Construction },
  { title: "I work on site", subtitle: "Supervisor, foreman, storekeeper", icon: HardHat },
  { title: "I supply materials", subtitle: "Vendors and suppliers", icon: Truck }
];

export function WelcomePage() {
  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>OnSite</span>
        </Link>
        <Link className="button button-outline" href="/sign-in">Sign in</Link>
      </header>
      <section className="welcome-content">
        <p className="eyebrow">PROJECT WORKSPACE</p>
        <h1>How will you use OnSite?</h1>
        <p className="welcome-subtitle">Pick the one that fits you best.</p>
        <div className="audience-list">
          {audiences.map(({ title, subtitle, icon: Icon }, index) => (
            <Link className="audience-card" href={index < 2 ? "/sign-up" : "/join"} key={title}>
              <span className="audience-icon"><Icon size={20} /></span>
              <span className="audience-copy"><strong>{title}</strong><small>{subtitle}</small></span>
              <ArrowRight className="audience-arrow" size={17} />
            </Link>
          ))}
        </div>
        <p className="invite-note">Project, site and vendor accounts are created from a company invitation.</p>
        <p className="welcome-trial">Start with your own company? <Link href="/sign-up">Create an account</Link></p>
      </section>
      <footer className="welcome-footer"><span>BUILT FOR THE PEOPLE WHO BUILD.</span><span>ONSITE · PROJECT WORKSPACE</span></footer>
    </main>
  );
}
