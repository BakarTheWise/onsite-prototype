"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, MapPin, Wallet } from "lucide-react";
import { calculatePlanPrice, planCatalog, planTiers, type BillingInterval, type PlanTier } from "@/lib/plans";

function naira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function CompanySetupForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [budgetNaira, setBudgetNaira] = useState("");
  const [plan, setPlan] = useState<PlanTier>("INDIVIDUAL");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTHLY");
  const [staffCount, setStaffCount] = useState("1");
  const [extraProjects, setExtraProjects] = useState("0");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const selectedPlan = planCatalog[plan];
  const numericStaffCount = Number(staffCount);
  const numericExtraProjects = Number(extraProjects);
  const extraProjectsAvailable = plan !== "ENTERPRISE_L" && plan !== "CORPORATE";
  const price = calculatePlanPrice(plan, billingInterval, numericExtraProjects);
  const planIsEligible = Number.isInteger(numericStaffCount) && numericStaffCount >= 1 && numericStaffCount <= selectedPlan.maxStaff;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planIsEligible) {
      setMessage("Choose a plan that supports your current staff count.");
      return;
    }
    setMessage("");
    setPending(true);
    try {
      const response = await fetch("/api/onboarding/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          projectName,
          location: location || undefined,
          budgetNaira: budgetNaira ? Number(budgetNaira) : undefined,
          plan,
          billingInterval,
          staffCount: numericStaffCount,
          extraProjects: price.billableExtraProjects
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message ?? "We couldn't save your workspace. Please try again.");
        return;
      }
      router.replace("/workspace");
      router.refresh();
    } catch {
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <section className="onboarding-form-section">
        <p className="eyebrow">YOUR BUSINESS</p>
        <h2>Set up your first project</h2>
        <p className="muted">Your trial starts when you create your workspace. No card is needed.</p>
      </section>
      <label className="form-field">
        <span>Company name <span className="field-optional">Optional for personal projects</span></span>
        <span className="input-wrap"><Building2 size={17} aria-hidden="true" />
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} minLength={2} maxLength={120} />
        </span>
      </label>
      <label className="form-field">
        <span>First project</span>
        <span className="input-wrap"><Building2 size={17} aria-hidden="true" />
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} minLength={2} maxLength={120} required />
        </span>
      </label>
      <label className="form-field">
        <span>Site location</span>
        <span className="input-wrap"><MapPin size={17} aria-hidden="true" />
          <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={160} />
        </span>
      </label>
      <label className="form-field">
        <span>Initial budget in NGN <span className="field-optional">Optional</span></span>
        <span className="input-wrap"><Wallet size={17} aria-hidden="true" />
          <input type="number" min="0" max="1000000000000" step="0.01" value={budgetNaira} onChange={(event) => setBudgetNaira(event.target.value)} />
        </span>
      </label>
      <section className="onboarding-form-section">
        <p className="eyebrow">14-DAY FREE TRIAL</p>
        <h2>Choose a plan</h2>
        <p className="muted">All plans include every feature during the trial. You will not be charged today.</p>
      </section>
      <div className="billing-toggle" role="group" aria-label="Billing interval">
        <button type="button" className={billingInterval === "MONTHLY" ? "selected" : ""} onClick={() => setBillingInterval("MONTHLY")}>Monthly</button>
        <button type="button" className={billingInterval === "YEARLY" ? "selected" : ""} onClick={() => setBillingInterval("YEARLY")}>Yearly · 2 months free</button>
      </div>
      <div className="plan-picker">
        {planTiers.map((value) => {
          const option = planCatalog[value];
          const planPeriodAmount = billingInterval === "YEARLY" ? option.yearly : option.monthly;
          return (
          <label className={plan === value ? "plan-option selected" : "plan-option"} key={value}>
            <input type="radio" name="planTier" value={value} checked={plan === value} onChange={() => setPlan(value)} />
            <span className="plan-option-copy"><strong>{option.title}</strong><small>{option.limit}</small></span>
            <strong className="plan-option-price">
              {planPeriodAmount === null ? "Quoted" : `${naira(planPeriodAmount)}${value === "CORPORATE" ? "+" : ""}/${billingInterval === "YEARLY" ? "year" : "month"}`}
            </strong>
          </label>
          );
        })}
      </div>
      <label className="form-field">
        <span>Staff who will log in</span>
        <span className="input-wrap"><input type="number" min="1" max="100000" step="1" value={staffCount} onChange={(event) => setStaffCount(event.target.value)} required /></span>
      </label>
      {!planIsEligible && <p className="notice notice-error" role="alert">This plan supports up to {selectedPlan.maxStaff} staff. Choose a higher tier to continue.</p>}
      {extraProjectsAvailable && (
        <label className="form-field">
          <span>Additional projects <span className="field-optional">{naira(billingInterval === "YEARLY" ? 300_000 : 30_000)} each/{billingInterval === "YEARLY" ? "year" : "month"}</span></span>
          <span className="input-wrap"><input type="number" min="0" max="100" step="1" value={extraProjects} onChange={(event) => setExtraProjects(event.target.value)} /></span>
        </label>
      )}
      <div className="plan-summary">
        <div><span>Plan total</span><strong>{price.quoteRequired ? "Quote required" : naira(price.subtotal)}</strong></div>
        <div><span>VAT 7.5%</span><strong>{price.quoteRequired ? "Quoted" : naira(price.vatAmount)}</strong></div>
        <div><span>Due today</span><strong>₦0</strong></div>
        <p>Free for 14 days. Payment details are collected only when a payment provider is connected.</p>
      </div>
      {message && <p className="notice notice-error" role="alert">{message}</p>}
      <button className="button button-dark button-wide" disabled={pending || !planIsEligible}>
        {pending ? "Creating workspace…" : "Start free trial"} {!pending && <ArrowRight size={16} />}
      </button>
    </form>
  );
}
