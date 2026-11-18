"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function ProjectCreateForm({
  companyId
}: {
  companyId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [budgetNaira, setBudgetNaira] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name,
          location: location || undefined,
          budgetNaira: budgetNaira ? Number(budgetNaira) : undefined
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message ?? "The project could not be created.");
        return;
      }
      router.replace(`/workspace/projects/${result.project.id}`);
      router.refresh();
    } catch {
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="content-column">
      <Link className="back-link" href="/workspace/projects"><ArrowLeft size={15} /> Projects</Link>
      <div className="page-heading">
        <p className="eyebrow">PROJECT SETUP</p>
        <h1>Create a project</h1>
        <p className="muted">Set up the shared workspace for plans, tasks, site reports and project records.</p>
      </div>
      <form className="panel form-panel form-stack" onSubmit={submit}>
        <label className="form-field"><span>Project name</span><input className="text-input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>
        <label className="form-field"><span>Site location</span><input className="text-input" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={160} /></label>
        <label className="form-field"><span>Initial budget in NGN <span className="field-optional">Optional</span></span><input className="text-input" type="number" min="0" max="1000000000000" step="0.01" value={budgetNaira} onChange={(event) => setBudgetNaira(event.target.value)} /></label>
        {message && <p className="notice notice-error" role="alert">{message}</p>}
        <div className="form-actions"><Link className="button button-outline" href="/workspace/projects">Cancel</Link><button className="button button-dark" disabled={pending}>{pending ? "Creating…" : "Create project"} {!pending && <ArrowRight size={16} />}</button></div>
      </form>
    </section>
  );
}
