import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function AccountSecurityPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Account security</h1>
        <p className="muted">Update your password and protect access to your OnSite account.</p>
      </section>
      <section className="content-column">
        <h2 className="section-title">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
