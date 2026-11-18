import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { calculatePlanPrice, planCatalog } from "@/lib/plans";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export default async function BillingPage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    select: { role: true, companyId: true, company: { select: { name: true } } }
  });
  if (!membership) {
    return (
      <section className="empty-state">
        <h1>Company billing is unavailable</h1>
        <p>Only a company owner can manage plan and billing details.</p>
        <Link className="button button-outline" href="/workspace">Return to workspace</Link>
      </section>
    );
  }
  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    return (
      <section className="empty-state">
        <h1>Plan details are private</h1>
        <p>Ask a company owner or administrator for plan information.</p>
        <Link className="button button-outline" href="/workspace">Return to workspace</Link>
      </section>
    );
  }

  const [subscription, projectCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { companyId: membership.companyId } }),
    prisma.project.count({ where: { companyId: membership.companyId, status: { not: "ARCHIVED" } } })
  ]);
  if (!subscription) {
    return (
      <section className="error-card">
        <span className="error-code">PLAN SETUP REQUIRED</span>
        <h1>Plan information is not available</h1>
        <p>Apply the latest database migration before accessing company billing.</p>
      </section>
    );
  }

  const plan = planCatalog[subscription.plan];
  const price = calculatePlanPrice(subscription.plan, subscription.billingInterval, subscription.extraProjects);
  const trialDays = Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const projectLimit = plan.maxProjects === null ? null : plan.maxProjects + subscription.extraProjects;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <p className="eyebrow">{membership.company.name}</p>
        <h1>Plan and billing</h1>
        <p className="muted">Review plan usage and your free-trial period.</p>
      </section>
      <section className="module-grid">
        <article className="module-card">
          <p className="eyebrow">CURRENT PLAN</p>
          <h2>{plan.title}</h2>
          <p className="muted">{subscription.billingInterval === "YEARLY" ? "Yearly billing" : "Monthly billing"} · {plan.limit}</p>
          <div className="module-list">
            <div className="module-list-row"><strong>Plan price</strong><span>{price.quoteRequired ? "Quote required" : money(price.subtotal)}</span></div>
            <div className="module-list-row"><strong>VAT (7.5%)</strong><span>{price.quoteRequired ? "Quoted" : money(price.vatAmount)}</span></div>
            <div className="module-list-row"><strong>Status</strong><span className="status-chip">{subscription.status.replaceAll("_", " ")}</span></div>
          </div>
        </article>
        <article className="module-card">
          <p className="eyebrow">TRIAL</p>
          <h2>{subscription.status === "TRIALING" ? `${trialDays} days remaining` : "Trial period ended"}</h2>
          <p className="muted">Started {subscription.trialStartsAt.toLocaleDateString()} · Ends {subscription.trialEndsAt.toLocaleDateString()}</p>
          <div className="plan-summary">
            <div><span>Due today</span><strong>₦0</strong></div>
            <p>Your trial does not collect card details or initiate a charge.</p>
          </div>
        </article>
        <article className="module-card">
          <p className="eyebrow">USAGE</p><h2>Projects</h2>
          <div className="module-list-row"><strong>{projectCount}{projectLimit === null ? " active" : ` of ${projectLimit}`}</strong><span>{projectLimit === null ? "Unlimited" : "Plan limit"}</span></div>
          <Link className="text-link" href="/workspace/projects">View projects <ArrowRight size={14} /></Link>
        </article>
        <article className="module-card">
          <p className="eyebrow">PAYMENT SETUP</p><h2>Payment provider required</h2>
          <p className="muted">No payment method is stored. Choose Paystack or Flutterwave before enabling automatic renewals.</p>
          <div className="notice"><ShieldCheck size={16} /><span>No charge is made while the provider is unconfigured.</span></div>
        </article>
      </section>
      <div className="notice"><strong>Plan changes and corporate quotes</strong><span>To change a paid plan or request Corporate pricing, contact the OnSite account administrator. Online plan changes are not enabled until billing is integrated.</span></div>
    </div>
  );
}
