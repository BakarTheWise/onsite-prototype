import { Suspense } from "react";
import { AuthPage } from "@/components/auth/auth-page";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";

function ResetFormFallback() {
  return <p className="notice" role="status">Checking your reset link…</p>;
}

export default function ResetPasswordPage() {
  return (
    <AuthPage
      eyebrow="ACCOUNT RECOVERY"
      title="Choose a new password"
      description="Use a strong password that you don't use for other accounts."
    >
      <Suspense fallback={<ResetFormFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPage>
  );
}
