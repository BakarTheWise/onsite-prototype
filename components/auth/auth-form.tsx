"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeInternalPath } from "@/lib/security/redirect";
import { signUpSchema } from "@/lib/validation";

type AuthMode = "sign-in" | "sign-up";

function authError(status?: number) {
  if (status === 429) return "Too many attempts. Wait a little and try again.";
  if (status === 403) return "Your email is not verified. Check your inbox, or try signing in again after email delivery is configured to resend the link.";
  if (status === 401 || status === 400 || status === 422) {
    return "Those details could not be verified. Check them and try again.";
  }
  return "OnSite could not complete that request. Please try again.";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState(false);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFailure(false);

    if (isSignUp) {
      const parsed = signUpSchema.safeParse({ name, email, password });
      if (!parsed.success) {
        setFailure(true);
        setMessage("Enter a name, a valid email address, and a password of at least 12 characters.");
        return;
      }
    } else if (!email.trim() || !password) {
      setFailure(true);
      setMessage("Enter your email address and password.");
      return;
    }

    setPending(true);
    try {
      const returnPath = safeInternalPath(
        new URLSearchParams(window.location.search).get("next"),
        isSignUp ? "/onboarding" : "/workspace"
      );
      if (isSignUp) {
        const result = await authClient.signUp.email({
          name: name.normalize("NFKC").trim(),
          email: email.trim().toLowerCase(),
          password,
          callbackURL: returnPath
        });
        if (result.error) {
          setFailure(true);
          setMessage(authError(result.error.status));
          return;
        }
        setMessage("Your account was created. Check your email to verify it. If no email arrives, configure SMTP and try signing in again to request another link.");
      } else {
        const result = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          callbackURL: returnPath
        });
        if (result.error) {
          setFailure(true);
          setMessage(authError(result.error.status));
          return;
        }
        router.replace(returnPath);
        router.refresh();
      }
    } catch {
      setFailure(true);
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <Link className="brand brand-light" href="/">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>OnSite</span>
        </Link>
        <div className="auth-intro-copy">
          <p className="eyebrow eyebrow-light">PROJECT WORKSPACE</p>
          <h1>Build with a clearer view of every site.</h1>
          <p>Plans, people, materials and money—connected to the work happening on site.</p>
        </div>
        <p className="auth-footnote">BUILT FOR THE PEOPLE WHO BUILD.</p>
      </section>

      <section className="auth-main">
        <div className="auth-card">
          <p className="eyebrow">{isSignUp ? "GET STARTED" : "WELCOME BACK"}</p>
          <h2>{isSignUp ? "Create your account" : "Sign in to OnSite"}</h2>
          <p className="muted">{isSignUp ? "Start setting up your company workspace." : "Open your project workspace securely."}</p>

          <form className="form-stack" onSubmit={submit} noValidate>
            {isSignUp && (
              <label className="form-field">
                <span>Your name</span>
                <span className="input-wrap"><UserRound size={17} aria-hidden="true" />
                  <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
                </span>
              </label>
            )}
            <label className="form-field">
              <span>Email address</span>
              <span className="input-wrap"><Mail size={17} aria-hidden="true" />
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
              </span>
            </label>
            <label className="form-field">
              <span>Password</span>
              <span className="input-wrap"><LockKeyhole size={17} aria-hidden="true" />
                <input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isSignUp ? 12 : undefined} maxLength={128} required />
              </span>
            </label>

            {!isSignUp && <Link className="text-link align-end" href="/forgot-password">Forgot password?</Link>}
            {message && <p className={failure ? "notice notice-error" : "notice notice-success"} role={failure ? "alert" : "status"}>{message}</p>}

            <button className="button button-dark button-wide" type="submit" disabled={pending}>
              {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
              {!pending && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>

          <div className="auth-switch">
            {isSignUp ? "Already have an account?" : "New to OnSite?"}{" "}
            <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link>
          </div>
          <p className="security-note">Your account is private. Project information is available only to members explicitly assigned to that workspace.</p>
        </div>
      </section>
    </main>
  );
}
