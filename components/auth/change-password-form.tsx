"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFailure(false);
    if (newPassword.length < 12 || newPassword.length > 128) {
      setFailure(true);
      setMessage("Choose a password between 12 and 128 characters.");
      return;
    }
    if (newPassword !== confirmation) {
      setFailure(true);
      setMessage("The new passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true
      });
      if (result.error) {
        setFailure(true);
        setMessage(result.error.status === 401
          ? "The current password is incorrect."
          : "Your password could not be changed. Please try again.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setMessage("Password updated. Other active sessions have been signed out.");
    } catch {
      setFailure(true);
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel form-panel form-stack" onSubmit={submit} noValidate>
      <label className="form-field"><span>Current password</span><span className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></span></label>
      <label className="form-field"><span>New password</span><span className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={128} required /></span></label>
      <label className="form-field"><span>Confirm new password</span><span className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} maxLength={128} required /></span></label>
      {message && <p className={failure ? "notice notice-error" : "notice notice-success"} role={failure ? "alert" : "status"}>{message}</p>}
      <div className="form-actions"><span className="muted small-copy">All other sessions are revoked after a change.</span><button className="button button-dark" disabled={pending}>{pending ? "Updating…" : "Update password"}</button></div>
    </form>
  );
}
