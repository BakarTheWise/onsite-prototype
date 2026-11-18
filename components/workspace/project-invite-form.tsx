"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";

const roles = [
  ["PROJECT_LEAD", "Project Manager / Lead"],
  ["SITE_ENGINEER", "Site Engineer"],
  ["QUANTITY_SURVEYOR", "Quantity Surveyor"],
  ["ACCOUNTANT", "Accountant"],
  ["PROCUREMENT_OFFICER", "Procurement Officer"],
  ["SITE_SUPERVISOR", "Site Supervisor / Foreman"],
  ["STOREKEEPER", "Storekeeper"],
  ["SECURITY", "Gate / Security"],
  ["VENDOR", "Vendor / Supplier"]
] as const;

export function ProjectInviteForm({
  projectId,
  projectName
}: {
  projectId: string;
  projectName: string;
}) {
  const [email, setEmail] = useState("");
  const [projectRole, setProjectRole] = useState<(typeof roles)[number][0]>("SITE_SUPERVISOR");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setPending(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, email: email.trim().toLowerCase(), projectRole })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message ?? "The invitation could not be sent.");
        return;
      }
      setSuccess(true);
      setMessage(`Invitation sent to ${email.trim().toLowerCase()}.`);
      setEmail("");
    } catch {
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="content-column">
      <Link className="back-link" href={`/workspace/projects/${projectId}/team`}><ArrowLeft size={15} /> Project team</Link>
      <div className="page-heading"><p className="eyebrow">PROJECT TEAM · {projectName}</p><h1>Invite a teammate</h1><p className="muted">Invitations expire after seven days and can only be accepted by the invited email address.</p></div>
      <form className="panel form-panel form-stack" onSubmit={submit}>
        <label className="form-field"><span>Email address</span><span className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></span></label>
        <label className="form-field"><span>Project role</span><select className="text-input" value={projectRole} onChange={(event) => setProjectRole(event.target.value as (typeof roles)[number][0])}>{roles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {message && <p className={success ? "notice notice-success" : "notice notice-error"} role={success ? "status" : "alert"}>{message}</p>}
        <div className="form-actions"><Link className="button button-outline" href={`/workspace/projects/${projectId}/team`}>Cancel</Link><button className="button button-dark" disabled={pending}>{pending ? "Sending…" : "Send invitation"} {!pending && <ArrowRight size={16} />}</button></div>
      </form>
    </section>
  );
}
