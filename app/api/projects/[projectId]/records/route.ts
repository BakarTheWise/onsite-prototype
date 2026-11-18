import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getProjectMembership } from "@/lib/project-access";
import { canWriteProjectRecord } from "@/lib/project-permissions";
import { prisma } from "@/lib/prisma";
import { projectRecordSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function writeAudit(
  transaction: Prisma.TransactionClient,
  companyId: string,
  actorId: string,
  entityType: string,
  entityId: string,
  action: string
) {
  await transaction.auditEvent.create({
    data: { companyId, actorId, entityType, entityId, action }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in to update this project." } },
      { status: 401 }
    );
  }

  const { projectId } = await params;
  const membership = await getProjectMembership(session.user.id, projectId);
  if (!membership) {
    return NextResponse.json(
      { error: { code: "PROJECT_NOT_FOUND", message: "This project is unavailable to your account." } },
      { status: 404 }
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "The request body must be valid JSON." } },
        { status: 400 }
      );
    }
    throw error;
  }

  const parsed = projectRecordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Check the project record details." } },
      { status: 400 }
    );
  }
  if (!canWriteProjectRecord(membership.role, parsed.data.type)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Your project role cannot make this change." } },
      { status: 403 }
    );
  }

  const { project } = membership;
  const projectIdValue = project.id;
  const companyId = project.companyId;
  const actorId = session.user.id;

  const result = await prisma.$transaction(async (transaction) => {
    switch (parsed.data.type) {
      case "task": {
        const { stageId, assigneeId, dueAt, ...taskInput } = parsed.data;
        if (stageId && !await transaction.stage.findFirst({ where: { id: stageId, projectId: projectIdValue }, select: { id: true } })) {
          return { error: "The selected stage does not belong to this project." };
        }
        if (assigneeId && !await transaction.projectMember.findFirst({
          where: { projectId: projectIdValue, userId: assigneeId, status: "ACTIVE" },
          select: { id: true }
        })) {
          return { error: "The selected owner is not an active project member." };
        }
        const created = await transaction.task.create({
          data: {
            projectId: projectIdValue,
            title: taskInput.title,
            description: taskInput.description,
            stageId,
            assigneeId,
            dueAt: dueAt ? new Date(dueAt) : undefined
          },
          select: { id: true, title: true }
        });
        await writeAudit(transaction, companyId, actorId, "Task", created.id, "task.created");
        return { record: created };
      }
      case "taskStatus": {
        const task = await transaction.task.findFirst({
          where: { id: parsed.data.taskId, projectId: projectIdValue },
          select: { id: true }
        });
        if (!task) return { error: "The task is not part of this project." };
        const updated = await transaction.task.update({
          where: { id: task.id },
          data: { status: parsed.data.status },
          select: { id: true, status: true }
        });
        await writeAudit(transaction, companyId, actorId, "Task", updated.id, "task.status_changed");
        return { record: updated };
      }
      case "stage": {
        const position = await transaction.stage.aggregate({
          where: { projectId: projectIdValue },
          _max: { position: true }
        });
        const created = await transaction.stage.create({
          data: {
            projectId: projectIdValue,
            name: parsed.data.name,
            position: (position._max.position ?? -1) + 1,
            startsAt: parsed.data.startsAt ? new Date(`${parsed.data.startsAt}T00:00:00.000Z`) : undefined,
            targetEnd: parsed.data.targetEnd ? new Date(`${parsed.data.targetEnd}T00:00:00.000Z`) : undefined
          },
          select: { id: true, name: true }
        });
        await writeAudit(transaction, companyId, actorId, "Stage", created.id, "stage.created");
        return { record: created };
      }
      case "dependency": {
        if (parsed.data.predecessorId === parsed.data.successorId) {
          return { error: "A task cannot depend on itself." };
        }
        const tasks = await transaction.task.findMany({
          where: {
            projectId: projectIdValue,
            id: { in: [parsed.data.predecessorId, parsed.data.successorId] }
          },
          select: { id: true }
        });
        if (tasks.length !== 2) return { error: "Choose two tasks from this project." };
        const edges = await transaction.taskDependency.findMany({
          where: { predecessor: { projectId: projectIdValue }, successor: { projectId: projectIdValue } },
          select: { predecessorId: true, successorId: true }
        });
        const nextTasks = new Map<string, string[]>();
        for (const edge of edges) {
          const next = nextTasks.get(edge.predecessorId) ?? [];
          next.push(edge.successorId);
          nextTasks.set(edge.predecessorId, next);
        }
        const pending = [parsed.data.successorId];
        const visited = new Set<string>();
        while (pending.length) {
          const taskId = pending.pop();
          if (!taskId || visited.has(taskId)) continue;
          if (taskId === parsed.data.predecessorId) {
            return { error: "This dependency would create a schedule loop." };
          }
          visited.add(taskId);
          pending.push(...(nextTasks.get(taskId) ?? []));
        }
        const duplicate = await transaction.taskDependency.findFirst({
          where: {
            predecessorId: parsed.data.predecessorId,
            successorId: parsed.data.successorId
          },
          select: { id: true }
        });
        if (duplicate) return { error: "That dependency already exists." };
        const created = await transaction.taskDependency.create({
          data: {
            predecessorId: parsed.data.predecessorId,
            successorId: parsed.data.successorId
          },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "TaskDependency", created.id, "dependency.created");
        return { record: created };
      }
      case "material": {
        const created = await transaction.material.create({
          data: { projectId: projectIdValue, name: parsed.data.name, unit: parsed.data.unit },
          select: { id: true, name: true }
        });
        await writeAudit(transaction, companyId, actorId, "Material", created.id, "material.created");
        return { record: created };
      }
      case "inventory": {
        const material = await transaction.material.findFirst({
          where: { id: parsed.data.materialId, projectId: projectIdValue },
          select: { id: true }
        });
        if (!material) return { error: "The selected material does not belong to this project." };
        const movements = await transaction.inventoryTransaction.groupBy({
          by: ["kind"],
          where: { projectId: projectIdValue, materialId: material.id },
          _sum: { quantity: true }
        });
        const onHand = movements.reduce((total, movement) => {
          const quantity = Number(movement._sum.quantity ?? 0);
          return total + quantity * (movement.kind === "ISSUE" ? -1 : 1);
        }, 0);
        if (parsed.data.kind === "ISSUE" && parsed.data.quantity > onHand) {
          return { error: "The requested issue is greater than the current store balance." };
        }
        const created = await transaction.inventoryTransaction.create({
          data: {
            projectId: projectIdValue,
            materialId: material.id,
            actorId,
            quantity: parsed.data.quantity,
            kind: parsed.data.kind,
            note: parsed.data.note
          },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "InventoryTransaction", created.id, `inventory.${parsed.data.kind.toLowerCase()}`);
        return { record: created };
      }
      case "budget": {
        const created = await transaction.budget.create({
          data: { projectId: projectIdValue, name: parsed.data.name, amount: parsed.data.amount },
          select: { id: true, name: true }
        });
        await writeAudit(transaction, companyId, actorId, "Budget", created.id, "budget.created");
        return { record: created };
      }
      case "fundRelease": {
        const created = await transaction.fundRelease.create({
          data: { projectId: projectIdValue, amount: parsed.data.amount, releasedAt: new Date() },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "FundRelease", created.id, "fund.released");
        return { record: created };
      }
      case "cash": {
        const created = await transaction.siteCashTransaction.create({
          data: {
            projectId: projectIdValue,
            amount: parsed.data.amount,
            direction: parsed.data.direction,
            description: parsed.data.description
          },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "SiteCashTransaction", created.id, `cash.${parsed.data.direction.toLowerCase()}`);
        return { record: created };
      }
      case "vendor": {
        const created = await transaction.vendor.create({
          data: {
            projectId: projectIdValue,
            name: parsed.data.name,
            email: parsed.data.email || null,
            phone: parsed.data.phone
          },
          select: { id: true, name: true }
        });
        await writeAudit(transaction, companyId, actorId, "Vendor", created.id, "vendor.created");
        return { record: created };
      }
      case "dailyLog": {
        const created = await transaction.dailyLog.create({
          data: {
            projectId: projectIdValue,
            authorId: actorId,
            logDate: new Date(`${parsed.data.logDate}T00:00:00.000Z`),
            weather: parsed.data.weather,
            workforce: parsed.data.workforce,
            workDone: parsed.data.workDone,
            issues: parsed.data.issues
          },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "DailyLog", created.id, "site_report.created");
        return { record: created };
      }
      case "issue": {
        const created = await transaction.issue.create({
          data: {
            projectId: projectIdValue,
            reporterId: actorId,
            title: parsed.data.title,
            description: parsed.data.description,
            priority: parsed.data.priority
          },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "Issue", created.id, "issue.created");
        return { record: created };
      }
      case "attendance": {
        const openShift = await transaction.attendance.findFirst({
          where: { projectId: projectIdValue, userId: actorId, checkedOut: null },
          select: { id: true }
        });
        if (parsed.data.action === "CHECK_IN") {
          if (openShift) return { error: "You are already checked in to this project." };
          const created = await transaction.attendance.create({
            data: { projectId: projectIdValue, userId: actorId },
            select: { id: true }
          });
          await writeAudit(transaction, companyId, actorId, "Attendance", created.id, "attendance.checked_in");
          return { record: created };
        }
        if (!openShift) return { error: "There is no open attendance record to check out." };
        const updated = await transaction.attendance.update({
          where: { id: openShift.id },
          data: { checkedOut: new Date() },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "Attendance", updated.id, "attendance.checked_out");
        return { record: updated };
      }
      case "gateEntry": {
        const created = await transaction.gateEntry.create({
          data: {
            projectId: projectIdValue,
            recordedById: actorId,
            direction: parsed.data.direction,
            vehicle: parsed.data.vehicle,
            loadSummary: parsed.data.loadSummary
          },
          select: { id: true }
        });
        await writeAudit(transaction, companyId, actorId, "GateEntry", created.id, `gate.${parsed.data.direction.toLowerCase()}`);
        return { record: created };
      }
      case "zone": {
        if (parsed.data.stageId && !await transaction.stage.findFirst({
          where: { id: parsed.data.stageId, projectId: projectIdValue },
          select: { id: true }
        })) {
          return { error: "The selected stage does not belong to this project." };
        }
        const created = await transaction.zone.create({
          data: { projectId: projectIdValue, name: parsed.data.name, stageId: parsed.data.stageId },
          select: { id: true, name: true }
        });
        await writeAudit(transaction, companyId, actorId, "Zone", created.id, "zone.created");
        return { record: created };
      }
    }
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "INVALID_PROJECT_RECORD", message: result.error } },
      { status: 400 }
    );
  }
  return NextResponse.json({ record: result.record }, { status: 201 });
}
