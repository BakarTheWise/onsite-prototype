import "dotenv/config";
import { createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Prisma } from "@prisma/client";
import { calculatePlanPrice } from "../lib/plans";
import { prisma } from "../lib/prisma";

const demoEmail = "demo@onsite.test";
const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD ?? "OnSiteDemo!2026";
const companyId = demoId("company");
const projectId = demoId("project");

function demoId(name: string) {
  const namespace = Buffer.from("5f1fcfc0251b4aa394c94702e1cda8af", "hex");
  const bytes = createHash("sha1").update(namespace).update(`onsite-demo:${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function day(offset: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const sampleMembers = [
  { key: "engineer", name: "Aisha Bello", email: "aisha.engineer@onsite.test", companyRole: "TEAM_MEMBER", projectRole: "SITE_ENGINEER" },
  { key: "surveyor", name: "Tunde Okafor", email: "tunde.surveyor@onsite.test", companyRole: "TEAM_MEMBER", projectRole: "QUANTITY_SURVEYOR" },
  { key: "accountant", name: "Nneka Eze", email: "nneka.accounts@onsite.test", companyRole: "ACCOUNTANT", projectRole: "ACCOUNTANT" },
  { key: "procurement", name: "Chidi Obi", email: "chidi.procurement@onsite.test", companyRole: "PROCUREMENT_OFFICER", projectRole: "PROCUREMENT_OFFICER" },
  { key: "supervisor", name: "Musa Ibrahim", email: "musa.supervisor@onsite.test", companyRole: "TEAM_MEMBER", projectRole: "SITE_SUPERVISOR" },
  { key: "storekeeper", name: "Grace Mensah", email: "grace.store@onsite.test", companyRole: "TEAM_MEMBER", projectRole: "STOREKEEPER" },
  { key: "security", name: "David James", email: "david.security@onsite.test", companyRole: "TEAM_MEMBER", projectRole: "SECURITY" },
  { key: "vendor", name: "Ada Supply Co.", email: "ada.supply@onsite.test", companyRole: null, projectRole: "VENDOR" }
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled in production.");
  }
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error("Set ENABLE_DEMO_SEED=true to seed the local demonstration account.");
  }
  if (demoPassword.length < 12 || demoPassword.length > 128) {
    throw new Error("DEMO_ACCOUNT_PASSWORD must be between 12 and 128 characters.");
  }

  const now = new Date();
  const ownerId = demoId("user-owner");
  const ownerPasswordHash = await hashPassword(demoPassword);
  const owner = await prisma.user.upsert({
    where: { email: demoEmail },
    create: { id: ownerId, name: "OnSite Demo Owner", email: demoEmail, emailVerified: true },
    update: { name: "OnSite Demo Owner", emailVerified: true, updatedAt: now }
  });
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: owner.id } },
    create: {
      id: demoId("account-owner"),
      accountId: owner.id,
      providerId: "credential",
      userId: owner.id,
      password: ownerPasswordHash
    },
    update: { password: ownerPasswordHash, updatedAt: now }
  });

  const team = await Promise.all(sampleMembers.map(async (member) => {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      create: {
        id: demoId(`user-${member.key}`),
        name: member.name,
        email: member.email,
        emailVerified: true
      },
      update: { name: member.name, emailVerified: true, updatedAt: now }
    });
    return { ...member, userId: user.id };
  }));
  const users = [{ userId: owner.id, key: "owner", name: owner.name }, ...team];
  const userIds = Object.fromEntries(users.map((user) => [user.key, user.userId]));
  const staffCount = team.filter((member) => member.companyRole !== null).length + 1;
  const price = calculatePlanPrice("ENTERPRISE_S", "MONTHLY", 0);

  const database = prisma;
    await database.company.upsert({
      where: { id: companyId },
      create: { id: companyId, name: "OnSite Demonstration Company" },
      update: { name: "OnSite Demonstration Company", updatedAt: now }
    });

    await database.auditEvent.deleteMany({ where: { companyId } });
    await database.project.deleteMany({ where: { id: projectId, companyId } });

    await database.companyMember.upsert({
      where: { companyId_userId: { companyId, userId: owner.id } },
      create: { companyId, userId: owner.id, role: "OWNER" },
      update: { role: "OWNER", status: "ACTIVE" }
    });
    for (const member of team) {
      if (!member.companyRole) continue;
      await database.companyMember.upsert({
        where: { companyId_userId: { companyId, userId: member.userId } },
        create: { companyId, userId: member.userId, role: member.companyRole },
        update: { role: member.companyRole, status: "ACTIVE" }
      });
    }

    await database.subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        plan: "ENTERPRISE_S",
        billingInterval: "MONTHLY",
        status: "TRIALING",
        staffCount,
        planAmountNaira: new Prisma.Decimal(price.planAmount),
        extraProjectsAmountNaira: new Prisma.Decimal(price.extraProjectAmount),
        vatAmountNaira: new Prisma.Decimal(price.vatAmount),
        trialStartsAt: now,
        trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      },
      update: {
        plan: "ENTERPRISE_S",
        billingInterval: "MONTHLY",
        status: "TRIALING",
        staffCount,
        extraProjects: 0,
        planAmountNaira: new Prisma.Decimal(price.planAmount),
        extraProjectsAmountNaira: new Prisma.Decimal(price.extraProjectAmount),
        vatAmountNaira: new Prisma.Decimal(price.vatAmount),
        trialStartsAt: now,
        trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      }
    });

    await database.project.create({
      data: {
        id: projectId,
        companyId,
        name: "Harbor View Apartments",
        location: "Lekki Phase 1, Lagos",
        status: "ACTIVE",
        budgetNaira: new Prisma.Decimal(185_000_000),
        startDate: day(-28),
        targetEnd: day(90)
      }
    });
    await database.projectMember.createMany({
      data: [
        { projectId, userId: owner.id, role: "OWNER" },
        ...team.map((member) => ({ projectId, userId: member.userId, role: member.projectRole }))
      ]
    });

    const stages = [
      { key: "mobilization", name: "Mobilization & Site Setup", position: 0, startsAt: day(-28), targetEnd: day(-18) },
      { key: "substructure", name: "Substructure", position: 1, startsAt: day(-17), targetEnd: day(5) },
      { key: "superstructure", name: "Superstructure", position: 2, startsAt: day(6), targetEnd: day(45) },
      { key: "finishes", name: "Finishes & Handover", position: 3, startsAt: day(46), targetEnd: day(90) }
    ];
    await database.stage.createMany({
      data: stages.map((stage) => ({
        id: demoId(`stage-${stage.key}`),
        projectId,
        name: stage.name,
        position: stage.position,
        startsAt: stage.startsAt,
        targetEnd: stage.targetEnd
      }))
    });

    const tasks = [
      { key: "survey", title: "Complete boundary survey", status: "DONE", stage: "mobilization", assignee: "engineer", due: -20 },
      { key: "clear-site", title: "Clear and secure site", status: "DONE", stage: "mobilization", assignee: "supervisor", due: -18 },
      { key: "excavate", title: "Excavate foundation trenches", status: "IN_PROGRESS", stage: "substructure", assignee: "supervisor", due: 2 },
      { key: "rebar", title: "Inspect reinforcement fixing", status: "IN_REVIEW", stage: "substructure", assignee: "engineer", due: 4 },
      { key: "concrete", title: "Pour ground-floor slab", status: "TODO", stage: "substructure", assignee: "supervisor", due: 8 },
      { key: "materials", title: "Confirm next cement delivery", status: "BLOCKED", stage: "substructure", assignee: "procurement", due: 1 },
      { key: "measure", title: "Submit interim quantity report", status: "IN_PROGRESS", stage: "substructure", assignee: "surveyor", due: 6 },
      { key: "cashbook", title: "Reconcile site cash receipts", status: "TODO", stage: "substructure", assignee: "accountant", due: 10 },
      { key: "columns", title: "Set out first-floor columns", status: "TODO", stage: "superstructure", assignee: "engineer", due: 20 },
      { key: "store", title: "Count remaining reinforcement bars", status: "TODO", stage: "substructure", assignee: "storekeeper", due: 3 }
    ] as const;
    await database.task.createMany({
      data: tasks.map((task) => ({
        id: demoId(`task-${task.key}`),
        projectId,
        stageId: demoId(`stage-${task.stage}`),
        assigneeId: userIds[task.assignee],
        title: task.title,
        description: `Demonstration record for ${task.title.toLowerCase()}.`,
        status: task.status,
        dueAt: new Date(Date.now() + task.due * 24 * 60 * 60 * 1000)
      }))
    });
    await database.taskDependency.createMany({
      data: [
        { id: demoId("dependency-survey-excavate"), predecessorId: demoId("task-survey"), successorId: demoId("task-excavate") },
        { id: demoId("dependency-rebar-concrete"), predecessorId: demoId("task-rebar"), successorId: demoId("task-concrete") }
      ]
    });

    const materials = [
      { key: "cement", name: "Portland cement", unit: "50 kg bags" },
      { key: "rebar", name: "Reinforcement bars", unit: "tonnes" },
      { key: "sand", name: "Sharp sand", unit: "truckloads" }
    ];
    await database.material.createMany({
      data: materials.map((material) => ({
        id: demoId(`material-${material.key}`),
        projectId,
        name: material.name,
        unit: material.unit
      }))
    });
    await database.inventoryTransaction.createMany({
      data: [
        { id: demoId("inventory-cement-receive"), projectId, materialId: demoId("material-cement"), actorId: userIds.storekeeper, kind: "RECEIVE", quantity: 420, note: "Initial delivery" },
        { id: demoId("inventory-cement-issue"), projectId, materialId: demoId("material-cement"), actorId: userIds.storekeeper, kind: "ISSUE", quantity: 135, note: "Foundation works" },
        { id: demoId("inventory-rebar-receive"), projectId, materialId: demoId("material-rebar"), actorId: userIds.storekeeper, kind: "RECEIVE", quantity: 18.5, note: "Y16 and Y12 bars" },
        { id: demoId("inventory-rebar-issue"), projectId, materialId: demoId("material-rebar"), actorId: userIds.storekeeper, kind: "ISSUE", quantity: 6.25, note: "Ground-floor reinforcement" },
        { id: demoId("inventory-sand-receive"), projectId, materialId: demoId("material-sand"), actorId: userIds.storekeeper, kind: "RECEIVE", quantity: 12, note: "Approved delivery" }
      ]
    });

    await database.budget.createMany({
      data: [
        { id: demoId("budget-civil"), projectId, name: "Civil works", amount: 68_000_000 },
        { id: demoId("budget-materials"), projectId, name: "Materials", amount: 52_000_000 },
        { id: demoId("budget-labor"), projectId, name: "Labour", amount: 38_000_000 },
        { id: demoId("budget-services"), projectId, name: "Professional services", amount: 12_000_000 }
      ]
    });
    await database.fundRelease.createMany({
      data: [
        { id: demoId("fund-release-1"), projectId, amount: 45_000_000, releasedAt: day(-20) },
        { id: demoId("fund-release-2"), projectId, amount: 18_000_000, releasedAt: day(-4) }
      ]
    });
    await database.siteCashTransaction.createMany({
      data: [
        { id: demoId("cash-in-1"), projectId, amount: 1_500_000, direction: "IN", description: "Initial site float" },
        { id: demoId("cash-out-1"), projectId, amount: 245_000, direction: "OUT", description: "Excavation equipment hire" },
        { id: demoId("cash-out-2"), projectId, amount: 82_500, direction: "OUT", description: "Site safety supplies" },
        { id: demoId("cash-in-2"), projectId, amount: 500_000, direction: "IN", description: "Additional approved float" }
      ]
    });
    await database.vendor.createMany({
      data: [
        { id: demoId("vendor-cement"), projectId, name: "Ada Supply Co.", email: "ada.supply@onsite.test", phone: "+234 800 555 0101" },
        { id: demoId("vendor-aggregate"), projectId, name: "Lagos Aggregate Works", email: "orders@aggregate.onsite.test", phone: "+234 800 555 0102" }
      ]
    });
    await database.dailyLog.createMany({
      data: [
        { id: demoId("daily-log-1"), projectId, authorId: userIds.engineer, logDate: day(-2), weather: "Clear", workforce: 24, workDone: "Completed excavation on the east wing and prepared blinding concrete.", issues: "One delivery arrived two hours late." },
        { id: demoId("daily-log-2"), projectId, authorId: userIds.supervisor, logDate: day(-1), weather: "Light rain", workforce: 21, workDone: "Installed reinforcement to grid lines A–D and checked formwork.", issues: "Keep the access route clear during deliveries." },
        { id: demoId("daily-log-3"), projectId, authorId: userIds.engineer, logDate: day(0), weather: "Overcast", workforce: 26, workDone: "Survey team verified column locations before the next concrete pour.", issues: null }
      ]
    });
    await database.issue.createMany({
      data: [
        { id: demoId("issue-delivery"), projectId, reporterId: userIds.supervisor, title: "Cement delivery short by 12 bags", description: "Supplier count did not match the delivery note. Reconcile before closing the order.", priority: "HIGH" },
        { id: demoId("issue-access"), projectId, reporterId: userIds.security, title: "Keep north gate access clear", description: "Two vehicles were parked across the delivery entrance during the morning shift.", priority: "MEDIUM" }
      ]
    });
    await database.attendance.createMany({
      data: [
        { id: demoId("attendance-owner"), projectId, userId: owner.id, checkedIn: new Date(Date.now() - 3 * 60 * 60 * 1000) },
        { id: demoId("attendance-engineer"), projectId, userId: userIds.engineer, checkedIn: new Date(Date.now() - 7 * 60 * 60 * 1000), checkedOut: new Date(Date.now() - 45 * 60 * 1000) },
        { id: demoId("attendance-supervisor"), projectId, userId: userIds.supervisor, checkedIn: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      ]
    });
    await database.gateEntry.createMany({
      data: [
        { id: demoId("gate-entry-1"), projectId, recordedById: userIds.security, direction: "IN", vehicle: "LND 284 XY", loadSummary: "Cement delivery · 180 bags", createdAt: new Date(Date.now() - 90 * 60 * 1000) },
        { id: demoId("gate-entry-2"), projectId, recordedById: userIds.security, direction: "IN", vehicle: "ABC 911 ZK", loadSummary: "Aggregate delivery · 1 truckload", createdAt: new Date(Date.now() - 55 * 60 * 1000) },
        { id: demoId("gate-entry-3"), projectId, recordedById: userIds.security, direction: "OUT", vehicle: "LND 284 XY", loadSummary: "Empty vehicle", createdAt: new Date(Date.now() - 20 * 60 * 1000) }
      ]
    });
    await database.zone.createMany({
      data: [
        { id: demoId("zone-east"), projectId, name: "East Wing", stageId: demoId("stage-substructure") },
        { id: demoId("zone-west"), projectId, name: "West Wing", stageId: demoId("stage-substructure") },
        { id: demoId("zone-ground"), projectId, name: "Ground Floor", stageId: demoId("stage-superstructure") },
        { id: demoId("zone-store"), projectId, name: "Material Store", stageId: demoId("stage-mobilization") }
      ]
    });
    await database.approval.create({
      data: {
        id: demoId("approval-budget"),
        projectId,
        submissionId: demoId("submission-budget"),
        submissionType: "BUDGET_ADJUSTMENT",
        status: "PENDING"
      }
    });
    await database.approval.create({
      data: {
        id: demoId("approval-material"),
        projectId,
        submissionId: demoId("submission-material"),
        submissionType: "MATERIAL_REQUEST",
        reviewerId: owner.id,
        status: "APPROVED",
        note: "Approved for the current substructure stage.",
        decidedAt: day(-3)
      }
    });
  console.info("Demo workspace is ready.");
  console.info(`Sign in with ${demoEmail}`);
  console.info(`Demo password: ${demoPassword}`);
  console.info("This command resets the demo project and audit history only.");
}

main()
  .catch((error: unknown) => {
    console.error("Could not seed the OnSite demo workspace.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
