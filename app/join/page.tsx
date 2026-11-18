import Link from "next/link";
import { AuthPage } from "@/components/auth/auth-page";
import { JoinInvitationForm } from "@/components/onboarding/join-invitation-form";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getServerSession();

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return (
      <AuthPage eyebrow="JOIN YOUR TEAM" title="Invitation link required" description="Open the private invitation link sent to your company email address.">
        <p className="notice notice-error" role="alert">This invitation link is missing or invalid.</p>
        <Link className="button button-dark button-wide" href="/">Return to OnSite</Link>
      </AuthPage>
    );
  }

  if (!session) {
    const next = encodeURIComponent(`/join?token=${token}`);
    return (
      <AuthPage eyebrow="JOIN YOUR TEAM" title="Sign in to continue" description="Sign in or create an account with the email address that received this invitation.">
        <div className="form-stack">
          <Link className="button button-dark button-wide" href={`/sign-in?next=${next}`}>Sign in to OnSite</Link>
          <Link className="button button-outline button-wide" href={`/sign-up?next=${next}`}>Create an account</Link>
        </div>
      </AuthPage>
    );
  }

  if (!session.user.emailVerified) {
    return (
      <AuthPage eyebrow="JOIN YOUR TEAM" title="Verify your email first" description="Your invitation can only be accepted from a verified account.">
        <p className="notice notice-error" role="alert">Check your inbox for the verification link, then reopen this invitation.</p>
      </AuthPage>
    );
  }

  return (
    <AuthPage eyebrow="JOIN YOUR TEAM" title="You’re invited" description="Accept this invitation to access the project workspace.">
      <JoinInvitationForm token={token} email={session.user.email} />
    </AuthPage>
  );
}
