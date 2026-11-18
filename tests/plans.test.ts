import assert from "node:assert/strict";
import test from "node:test";
import { calculatePlanPrice } from "../lib/plans";

test("monthly Individual pricing includes the supplied VAT rate", () => {
  const price = calculatePlanPrice("INDIVIDUAL", "MONTHLY", 0);
  assert.equal(price.subtotal, 25_000);
  assert.equal(price.vatAmount, 1_875);
  assert.equal(price.total, 26_875);
  assert.equal(price.quoteRequired, false);
});

test("yearly extra projects use the annual add-on rate", () => {
  const price = calculatePlanPrice("INDIVIDUAL", "YEARLY", 1);
  assert.equal(price.subtotal, 550_000);
  assert.equal(price.vatAmount, 41_250);
});

test("Corporate plans require a quote and do not add project fees", () => {
  const price = calculatePlanPrice("CORPORATE", "YEARLY", 10);
  assert.equal(price.planAmount, 0);
  assert.equal(price.billableExtraProjects, 0);
  assert.equal(price.quoteRequired, true);
});
