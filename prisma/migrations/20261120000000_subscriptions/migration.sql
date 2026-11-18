CREATE TYPE "PlanTier" AS ENUM ('INDIVIDUAL', 'ENTERPRISE_S', 'ENTERPRISE_M', 'ENTERPRISE_L', 'CORPORATE');

CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'INDIVIDUAL',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "staffCount" INTEGER NOT NULL DEFAULT 1,
    "extraProjects" INTEGER NOT NULL DEFAULT 0,
    "planAmountNaira" DECIMAL(16,2) NOT NULL,
    "extraProjectsAmountNaira" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "vatAmountNaira" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "trialStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "subscriptions" (
    "id",
    "companyId",
    "plan",
    "billingInterval",
    "status",
    "staffCount",
    "extraProjects",
    "planAmountNaira",
    "extraProjectsAmountNaira",
    "vatAmountNaira",
    "trialStartsAt",
    "trialEndsAt",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    'INDIVIDUAL',
    'MONTHLY',
    'TRIALING',
    1,
    0,
    25000,
    0,
    1875,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "companies";

CREATE UNIQUE INDEX "subscriptions_companyId_key" ON "subscriptions"("companyId");

ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
