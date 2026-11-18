"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function RequestPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFailure(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFailure(true);
      setMessage("Enter a valid email address.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (result.error) {
        setFailure(true);
        setMessage(result.error.status === 429
          ? "Too many reset requests. Try again later."
          : "We couldn't send a reset email right now. Please try again.");
        return;
      }
      setMessage("If an account matches that address, a reset link will arrive shortly. It expires in 30 minutes.");
    } catch {
      setFailure(true);
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      <label className="form-field">
        <span>Email address</span>
        <span className="input-wrap"><Mail size={17} aria-hidden="true" />
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
        </span>
      </label>
      {message && <p className={failure ? "notice notice-error" : "notice notice-success"} role={failure ? "alert" : "status"}>{message}</p>}
      <button className="button button-dark button-wide" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"} {!pending && <ArrowRight size={16} aria-hidden="true" />}
      </button>
      <Link className="text-link" href="/sign-in">Back to sign in</Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidLink = searchParams.get("error") === "INVALID_TOKEN" || !token;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFailure(false);
    if (password.length < 12 || password.length > 128) {
      setFailure(true);
      setMessage("Choose a password between 12 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFailure(true);
      setMessage("The passwords do not match.");
      return;
    }
    if (!token) return;

    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setFailure(true);
        setMessage("This link is invalid or expired. Request a new reset link.");
        return;
      }
      setMessage("Your password has been updated. Sign in with the new password.");
      window.setTimeout(() => router.replace("/sign-in"), 1200);
    } catch {
      setFailure(true);
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (invalidLink) {
    return (
      <div className="form-stack">
        <div className="notice notice-error" role="alert">
          <strong>This reset link is unavailable.</strong>
          <span>Links expire after 30 minutes and can only be used once.</span>
        </div>
        <Link className="button button-dark button-wide" href="/forgot-password">Request a new link <ArrowRight size={16} /></Link>
      </div>
    );
  }

  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      <label className="form-field">
        <span>New password</span>
        <span className="input-wrap"><LockKeyhole size={17} aria-hidden="true" />
          <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required />
        </span>
      </label>
      <label className="form-field">
        <span>Confirm new password</span>
        <span className="input-wrap"><LockKeyhole size={17} aria-hidden="true" />
          <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} required />
        </span>
      </label>
      {message && <p className={failure ? "notice notice-error" : "notice notice-success"} role={failure ? "alert" : "status"}>{message}</p>}
      <button className="button button-dark button-wide" disabled={pending}>
        {pending ? "Updating…" : "Update password"} {!pending && <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </form>
  );
}
