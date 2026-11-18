import { z } from "zod";
import { planCatalog } from "@/lib/plans";

export function sanitizeText(value: string) {
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

const textField = (min: number, max: number) =>
  z.string().transform(sanitizeText).pipe(z.string().min(min).max(max));

export const signUpSchema = z.object({
  name: textField(2, 100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128)
}).strict();

export const companySetupSchema = z.object({
  companyName: textField(2, 120).optional(),
  projectName: textField(2, 120),
  location: textField(2, 160).optional(),
  budgetNaira: z.number().finite().nonnegative().max(1_000_000_000_000).optional(),
  plan: z.enum(["INDIVIDUAL", "ENTERPRISE_S", "ENTERPRISE_M", "ENTERPRISE_L", "CORPORATE"]).default("INDIVIDUAL"),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  staffCount: z.number().int().min(1).max(100_000).default(1),
  extraProjects: z.number().int().min(0).max(100).default(0)
}).strict().superRefine((data, context) => {
  if (data.staffCount > planCatalog[data.plan].maxStaff) {
    context.addIssue({
      code: "custom",
      path: ["plan"],
      message: "The selected plan does not support this staff count."
    });
  }
});

export const projectCreateSchema = z.object({
  companyId: z.string().uuid(),
  name: textField(2, 120),
  location: textField(2, 160).optional(),
  budgetNaira: z.number().finite().nonnegative().max(1_000_000_000_000).optional()
}).strict();

export const invitationCreateSchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(254),
  projectRole: z.enum([
    "PROJECT_LEAD",
    "SITE_ENGINEER",
    "QUANTITY_SURVEYOR",
    "ACCOUNTANT",
    "PROCUREMENT_OFFICER",
    "SITE_SUPERVISOR",
    "STOREKEEPER",
    "SECURITY",
    "VENDOR"
  ])
}).strict();

export const invitationAcceptSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i)
}).strict();

const optionalText = (max: number) => z.string().transform(sanitizeText).pipe(z.string().max(max)).optional();
const optionalUuid = z.string().uuid().optional();
const positiveAmount = z.number().finite().positive().max(1_000_000_000_000);
const projectTaskStatus = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"]);

export const projectRecordSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("task"),
    title: textField(2, 160),
    description: optionalText(3000),
    stageId: optionalUuid,
    assigneeId: optionalUuid,
    dueAt: z.string().datetime().optional()
  }).strict(),
  z.object({
    type: z.literal("taskStatus"),
    taskId: z.string().uuid(),
    status: projectTaskStatus
  }).strict(),
  z.object({
    type: z.literal("stage"),
    name: textField(2, 100),
    startsAt: z.string().date().optional(),
    targetEnd: z.string().date().optional()
  }).strict(),
  z.object({
    type: z.literal("dependency"),
    predecessorId: z.string().uuid(),
    successorId: z.string().uuid()
  }).strict(),
  z.object({
    type: z.literal("material"),
    name: textField(2, 120),
    unit: textField(1, 24)
  }).strict(),
  z.object({
    type: z.literal("inventory"),
    materialId: z.string().uuid(),
    kind: z.enum(["RECEIVE", "ISSUE"]),
    quantity: positiveAmount,
    note: optionalText(500)
  }).strict(),
  z.object({
    type: z.literal("budget"),
    name: textField(2, 100),
    amount: positiveAmount
  }).strict(),
  z.object({
    type: z.literal("fundRelease"),
    amount: positiveAmount
  }).strict(),
  z.object({
    type: z.literal("cash"),
    amount: positiveAmount,
    direction: z.enum(["IN", "OUT"]),
    description: textField(2, 500)
  }).strict(),
  z.object({
    type: z.literal("vendor"),
    name: textField(2, 120),
    email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
    phone: optionalText(32)
  }).strict(),
  z.object({
    type: z.literal("dailyLog"),
    logDate: z.string().date(),
    weather: optionalText(80),
    workforce: z.number().int().nonnegative().max(100_000).optional(),
    workDone: textField(2, 3000),
    issues: optionalText(3000)
  }).strict(),
  z.object({
    type: z.literal("issue"),
    title: textField(2, 160),
    description: textField(2, 3000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
  }).strict(),
  z.object({
    type: z.literal("attendance"),
    action: z.enum(["CHECK_IN", "CHECK_OUT"])
  }).strict(),
  z.object({
    type: z.literal("gateEntry"),
    direction: z.enum(["IN", "OUT"]),
    vehicle: optionalText(100),
    loadSummary: optionalText(500)
  }).strict(),
  z.object({
    type: z.literal("zone"),
    name: textField(2, 100),
    stageId: optionalUuid
  }).strict()
]);
