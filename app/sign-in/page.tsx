import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getServerSession } from "@/lib/server-session";
import { safeInternalPath } from "@/lib/security/redirect";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getServerSession()) redirect(safeInternalPath(next ?? null, "/workspace"));
  return <AuthForm mode="sign-in" />;
}
