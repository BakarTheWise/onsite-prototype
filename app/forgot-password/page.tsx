import { AuthPage } from "@/components/auth/auth-page";
import { RequestPasswordResetForm } from "@/components/auth/password-reset-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      description="Enter the email address on your account. Reset links expire after 30 minutes."
    >
      <RequestPasswordResetForm />
    </AuthPage>
  );
}
