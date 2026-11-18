import assert from "node:assert/strict";
import test from "node:test";
import {
  companySetupSchema,
  projectRecordSchema,
  sanitizeText,
  signUpSchema,
  projectCreateSchema
} from "../lib/validation";

test("text normalization removes control characters and normalizes Unicode", () => {
  assert.equal(sanitizeText("  A\u0000\u0009B  "), "AB");
  assert.equal(sanitizeText("Cafe\u0301"), "Café");
});

test("sign-up input normalizes email and name without modifying passwords", () => {
  const parsed = signUpSchema.parse({
    name: "  Alex\u0000 Builder ",
    email: "  PERSON@EXAMPLE.COM ",
    password: "  twelve chars  "
  });
  assert.equal(parsed.name, "Alex Builder");
  assert.equal(parsed.email, "person@example.com");
  assert.equal(parsed.password, "  twelve chars  ");
});

test("project input rejects unknown fields and sanitizes text", () => {
  const parsed = projectCreateSchema.parse({
    companyId: "550e8400-e29b-41d4-a716-446655440000",
    name: "  Site\u0000 A ",
    location: " Lagos "
  });
  assert.equal(parsed.name, "Site A");
  assert.equal(parsed.location, "Lagos");
  assert.equal(projectCreateSchema.safeParse({
    companyId: "550e8400-e29b-41d4-a716-446655440000",
    name: "Valid Site",
    admin: true
  }).success, false);
  assert.equal(projectCreateSchema.safeParse({
    companyId: "550e8400-e29b-41d4-a716-446655440000",
    name: "Valid Site",
    budgetNaira: -1
  }).success, false);
});

test("company setup applies plan defaults and enforces the selected staff limit", () => {
  const parsed = companySetupSchema.parse({ projectName: "First site" });
  assert.equal(parsed.companyName, undefined);
  assert.equal(parsed.plan, "INDIVIDUAL");
  assert.equal(parsed.billingInterval, "MONTHLY");
  assert.equal(companySetupSchema.safeParse({
    projectName: "First site",
    plan: "INDIVIDUAL",
    staffCount: 6
  }).success, false);
});

test("project records sanitize names and reject unknown fields", () => {
  const parsed = projectRecordSchema.parse({
    type: "task",
    title: "  Pour\u0000 foundation  ",
    description: "  Before slab work "
  });
  assert.equal(parsed.type, "task");
  assert.equal(parsed.title, "Pour foundation");
  assert.equal(parsed.description, "Before slab work");
  assert.equal(projectRecordSchema.safeParse({
    type: "cash",
    amount: 0,
    direction: "OUT",
    description: "Invalid amount",
    userId: "550e8400-e29b-41d4-a716-446655440000"
  }).success, false);
});
