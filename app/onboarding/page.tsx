import { redirect } from "next/navigation";
import { CompanySetupForm } from "@/components/onboarding/company-setup-form";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";
import { AuthPage } from "@/components/auth/auth-page";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { id: true }
  });
  if (membership) redirect("/workspace");

  return (
    <AuthPage
      eyebrow="COMPANY SETUP"
      title="Start your project workspace"
      description="Create your company and first project. You can invite your team when setup is complete."
    >
      <CompanySetupForm />
    </AuthPage>
  );
}
