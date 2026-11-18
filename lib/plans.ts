export const planTiers = ["INDIVIDUAL", "ENTERPRISE_S", "ENTERPRISE_M", "ENTERPRISE_L", "CORPORATE"] as const;
export type PlanTier = (typeof planTiers)[number];
export type BillingInterval = "MONTHLY" | "YEARLY";

type PlanDefinition = {
  title: string;
  limit: string;
  maxStaff: number;
  maxProjects: number | null;
  monthly: number;
  yearly: number | null;
};

export const planCatalog: Record<PlanTier, PlanDefinition> = {
  INDIVIDUAL: {
    title: "Individual",
    limit: "1 project · up to 5 staff",
    maxStaff: 5,
    maxProjects: 1,
    monthly: 25_000,
    yearly: 250_000
  },
  ENTERPRISE_S: {
    title: "Enterprise S",
    limit: "3 projects · up to 15 staff",
    maxStaff: 15,
    maxProjects: 3,
    monthly: 120_000,
    yearly: 1_200_000
  },
  ENTERPRISE_M: {
    title: "Enterprise M",
    limit: "10 projects · up to 50 staff",
    maxStaff: 50,
    maxProjects: 10,
    monthly: 350_000,
    yearly: 3_500_000
  },
  ENTERPRISE_L: {
    title: "Enterprise L",
    limit: "Unlimited projects · up to 150 staff",
    maxStaff: 150,
    maxProjects: null,
    monthly: 850_000,
    yearly: 8_500_000
  },
  CORPORATE: {
    title: "Corporate",
    limit: "Unlimited projects · 150+ staff",
    maxStaff: 100_000,
    maxProjects: null,
    monthly: 1_500_000,
    yearly: null
  }
};

export function calculatePlanPrice(plan: PlanTier, interval: BillingInterval, extraProjects: number) {
  const selected = planCatalog[plan];
  const quoteRequired = plan === "CORPORATE";
  const billableExtraProjects = plan === "ENTERPRISE_L" || plan === "CORPORATE" ? 0 : extraProjects;
  const planAmount = interval === "YEARLY" ? selected.yearly : selected.monthly;
  const extraProjectAmount = billableExtraProjects * (interval === "YEARLY" ? 300_000 : 30_000);
  const subtotal = (planAmount ?? 0) + extraProjectAmount;
  const vatAmount = Math.round(subtotal * 0.075 * 100) / 100;

  return {
    planAmount: planAmount ?? 0,
    billableExtraProjects,
    extraProjectAmount,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    quoteRequired
  };
}
