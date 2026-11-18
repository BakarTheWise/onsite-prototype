import { redirect } from "next/navigation";
import { WelcomePage } from "@/components/welcome-page";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await getServerSession()) redirect("/workspace");
  return <WelcomePage />;
}
