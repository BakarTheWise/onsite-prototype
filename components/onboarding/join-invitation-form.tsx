"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function JoinInvitationForm({
  token,
  email
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function accept() {
    setMessage("");
    setPending(true);
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message ?? "The invitation could not be accepted.");
        return;
      }
      router.replace("/workspace");
      router.refresh();
    } catch {
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-stack">
      <div className="invite-summary">
        <ShieldCheck size={18} />
        <span>This invitation is for <strong>{email}</strong>. You must be signed in with this verified email address.</span>
      </div>
      {message && <p className="notice notice-error" role="alert">{message}</p>}
      <button className="button button-dark button-wide" onClick={accept} disabled={pending}>
        {pending ? "Joining project…" : "Accept invitation"} {!pending && <ArrowRight size={16} />}
      </button>
    </div>
  );
}
