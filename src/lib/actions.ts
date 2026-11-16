"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FaultStatus, PriorityLevel, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { calculatePriority } from "@/lib/priority";
import { faultReportSchema, waterPointSchema } from "@/lib/validators";

function formString(formData: FormData, key: string) { return String(formData.get(key) ?? ""); }
function formBool(formData: FormData, key: string) { return formData.get(key) === "on" || formData.get(key) === "true"; }
function makeReference() { return `MF-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }

async function audit(actor: { id: string; email: string }, action: string, entityType: string, entityId: string, metadata?: object) {
  await prisma.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, entityType, entityId, metadata: metadata as never } });
}

export async function createWaterPointAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const parsed = waterPointSchema.safeParse({
    code: formString(formData,"code"), name: formString(formData,"name"), type: formString(formData,"type"),
    county: formString(formData,"county"), subCounty: formString(formData,"subCounty"), community: formString(formData,"community"),
    peopleServed: formString(formData,"peopleServed"), servesSchool: formBool(formData,"servesSchool"),
    servesHealthFacility: formBool(formData,"servesHealthFacility"), alternativeWaterAvailable: formBool(formData,"alternativeWaterAvailable"),
  });
  if (!parsed.success) redirect("/water-points/new?error=invalid");
  const point = await prisma.waterPoint.create({ data: { ...parsed.data, operatorId: user.id } });
  await audit(user, "WATER_POINT_CREATED", "WaterPoint", point.id);
  revalidatePath("/water-points"); revalidatePath("/dashboard"); redirect(`/water-points/${point.id}`);
}

export async function createFaultReportAction(formData: FormData) {
  const { user } = await requireUser();
  const raw = {
    waterPointId: formString(formData,"waterPointId"), category: formString(formData,"category"), description: formString(formData,"description"),
    peopleAffected: formString(formData,"peopleAffected"), downtimeHours: formString(formData,"downtimeHours"),
    allServiceInterrupted: formBool(formData,"allServiceInterrupted"), alternativeWaterAvailable: formBool(formData,"alternativeWaterAvailable"),
  };
  const parsed = faultReportSchema.safeParse(raw);
  if (!parsed.success) redirect("/faults/new?error=invalid");
  const point = await prisma.waterPoint.findUnique({ where: { id: parsed.data.waterPointId } });
  if (!point) redirect("/faults/new?error=water-point-not-found");
  const priorityInput = { ...parsed.data, servesSchool: point.servesSchool, servesHealthFacility: point.servesHealthFacility };
  const priority = calculatePriority(priorityInput);
  const fault = await prisma.$transaction(async (tx) => {
    const created = await tx.faultReport.create({ data: { ...parsed.data, reference: makeReference(), reporterId: user.id, priority: priority.level, priorityScore: priority.score, updates: { create: { authorId: user.id, status: "REPORTED", notes: "Fault report submitted." } } } });
    if (parsed.data.allServiceInterrupted) await tx.waterPoint.update({ where: { id: point.id }, data: { status: "NON_OPERATIONAL" } });
    else await tx.waterPoint.update({ where: { id: point.id }, data: { status: "PARTIALLY_OPERATIONAL" } });
    return created;
  });
  await audit(user, "FAULT_REPORTED", "FaultReport", fault.id, { reference: fault.reference, priority: priority.level });
  revalidatePath("/dashboard"); revalidatePath("/faults"); redirect(`/faults/${fault.id}`);
}

export async function assessFaultAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const faultId = formString(formData,"faultId");
  const decision = formString(formData,"decision");
  const notes = formString(formData,"notes").trim();
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true } });
  if (!fault || !notes) redirect(`/faults/${faultId}?error=invalid`);
  if (decision === "ASSESS") {
    if (fault.status !== "REPORTED") redirect(`/faults/${faultId}?error=invalid-assessment`);
    await prisma.faultReport.update({ where: { id: faultId }, data: { status: "UNDER_ASSESSMENT" } });
    await prisma.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "UNDER_ASSESSMENT", notes } });
  } else if (decision === "REJECT") {
    if (!["REPORTED", "UNDER_ASSESSMENT"].includes(fault.status)) redirect(`/faults/${faultId}?error=invalid-decision`);
    await prisma.faultReport.update({ where: { id: faultId }, data: { status: "REJECTED", rejectedReason: notes } });
    await prisma.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "REJECTED", notes } });
  } else {
    if (!["REPORTED", "UNDER_ASSESSMENT"].includes(fault.status)) redirect(`/faults/${faultId}?error=invalid-decision`);
    const cost = formString(formData,"estimatedCost");
    await prisma.faultReport.update({ where: { id: faultId }, data: { status: "APPROVED", repairJob: { upsert: { create: { estimatedCost: cost ? Number(cost) : undefined }, update: { estimatedCost: cost ? Number(cost) : undefined } } } } });
    await prisma.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "APPROVED", notes } });
  }
  await audit(user, decision === "REJECT" ? "FAULT_REJECTED" : decision === "ASSESS" ? "FAULT_ASSESSED" : "FAULT_APPROVED", "FaultReport", faultId);
  revalidatePath(`/faults/${faultId}`); revalidatePath("/dashboard"); redirect(`/faults/${faultId}`);
}

export async function assignTechnicianAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const faultId = formString(formData,"faultId"); const technicianId = formString(formData,"technicianId");
  const technician = await prisma.user.findFirst({ where: { id: technicianId, role: "TECHNICIAN", technicianProfile: { available: true } } });
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true } });
  if (!technician || !fault || !["APPROVED", "REOPENED"].includes(fault.status)) redirect(`/faults/${faultId}?error=invalid-assignment`);
  await prisma.$transaction([
    prisma.repairJob.upsert({ where: { faultReportId: faultId }, create: { faultReportId: faultId, technicianId, assignedAt: new Date() }, update: { technicianId, assignedAt: new Date() } }),
    prisma.faultReport.update({ where: { id: faultId }, data: { status: "ASSIGNED" } }),
    prisma.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "ASSIGNED", notes: `Assigned to ${technician.name}.` } }),
  ]);
  await audit(user, "TECHNICIAN_ASSIGNED", "FaultReport", faultId, { technicianId });
  revalidatePath(`/faults/${faultId}`); revalidatePath("/dashboard"); redirect(`/faults/${faultId}`);
}

const allowedTechnicianTransitions: Partial<Record<FaultStatus, FaultStatus[]>> = {
  ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["REPAIR_COMPLETED"], REPAIR_COMPLETED: ["AWAITING_CONFIRMATION"],
};
export async function updateRepairStatusAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR", "TECHNICIAN"]);
  const faultId = formString(formData,"faultId"); const nextStatus = formString(formData,"status") as FaultStatus; const notes = formString(formData,"notes").trim();
  if (notes.length < 4 || !Object.values(FaultStatus).includes(nextStatus)) redirect(`/faults/${faultId}?error=invalid-update`);
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true } });
  if (!fault?.repairJob) redirect(`/faults/${faultId}?error=no-repair-job`);
  if (user.role === "TECHNICIAN" && fault.repairJob.technicianId !== user.id) redirect("/dashboard?error=forbidden");
  const allowed = allowedTechnicianTransitions[fault.status] ?? [];
  if (!allowed.includes(nextStatus)) redirect(`/faults/${faultId}?error=invalid-transition`);
  await prisma.$transaction([
    prisma.faultReport.update({ where: { id: faultId }, data: { status: nextStatus } }),
    prisma.repairJob.update({ where: { id: fault.repairJob.id }, data: { startedAt: nextStatus === "IN_PROGRESS" ? new Date() : undefined, completedAt: nextStatus === "REPAIR_COMPLETED" ? new Date() : undefined } }),
    prisma.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: nextStatus, notes } }),
  ]);
  await audit(user, "REPAIR_STATUS_UPDATED", "FaultReport", faultId, { from: fault.status, to: nextStatus });
  revalidatePath(`/faults/${faultId}`); revalidatePath("/dashboard"); redirect(`/faults/${faultId}`);
}

export async function confirmRestorationAction(formData: FormData) {
  const { user } = await requireUser();
  const faultId = formString(formData,"faultId"); const result = formString(formData,"result"); const notes = formString(formData,"notes").trim();
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
  if (!fault?.repairJob || fault.status !== "AWAITING_CONFIRMATION") redirect(`/faults/${faultId}?error=not-awaiting-confirmation`);
  if (user.role === "COMMUNITY" && fault.reporterId !== user.id) redirect("/dashboard?error=forbidden");
  if (!["WATER_RESTORED", "NOT_RESTORED"].includes(result)) redirect(`/faults/${faultId}?error=invalid-confirmation`);
  const restored = result === "WATER_RESTORED";
  await prisma.$transaction(async (tx) => {
    await tx.restorationConfirmation.create({ data: { repairJobId: fault.repairJob!.id, confirmedById: user.id, result: result as "WATER_RESTORED" | "NOT_RESTORED", notes: notes || undefined } });
    await tx.faultReport.update({ where: { id: faultId }, data: { status: restored ? "RESTORED" : "REOPENED" } });
    await tx.repairJob.update({ where: { id: fault.repairJob!.id }, data: { restoredAt: restored ? new Date() : null } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: restored ? "RESTORED" : "REOPENED", notes: notes || (restored ? "Community confirmed water service is restored." : "Water service is not yet restored.") } });
    if (restored) {
      const remainingOpenFaults = await tx.faultReport.findMany({
        where: { waterPointId: fault.waterPointId, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } },
        select: { allServiceInterrupted: true },
      });
      const nextWaterPointStatus = remainingOpenFaults.length === 0
        ? "OPERATIONAL"
        : remainingOpenFaults.some((item) => item.allServiceInterrupted) ? "NON_OPERATIONAL" : "PARTIALLY_OPERATIONAL";
      await tx.waterPoint.update({ where: { id: fault.waterPointId }, data: { status: nextWaterPointStatus } });
    }
  });
  await audit(user, "RESTORATION_CONFIRMED", "FaultReport", faultId, { result });
  revalidatePath(`/faults/${faultId}`); revalidatePath("/dashboard"); redirect(`/faults/${faultId}`);
}

export async function setUserRoleAction(formData: FormData) {
  const { user: actor } = await requireUser(["ADMIN"]);
  const targetId = formString(formData, "userId");
  const role = formString(formData, "role") as UserRole;
  const skills = formString(formData, "skills").split(",").map((value) => value.trim()).filter(Boolean);
  const serviceAreas = formString(formData, "serviceAreas").split(",").map((value) => value.trim()).filter(Boolean);
  const available = formBool(formData, "available");
  if (!Object.values(UserRole).includes(role) || targetId === actor.id) redirect("/team?error=invalid-role-change");
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) redirect("/team?error=user-not-found");
  if (target.role === "TECHNICIAN" && role !== "TECHNICIAN") {
    const activeAssignments = await prisma.repairJob.count({
      where: { technicianId: targetId, faultReport: { status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } },
    });
    if (activeAssignments > 0) redirect("/team?error=technician-has-active-assignments");
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: targetId }, data: { role } });
    if (role === "TECHNICIAN") {
      await tx.technicianProfile.upsert({
        where: { userId: targetId },
        create: { userId: targetId, skills, serviceAreas, available },
        update: { skills, serviceAreas, available },
      });
    } else {
      await tx.technicianProfile.deleteMany({ where: { userId: targetId } });
    }
    await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: "USER_ROLE_UPDATED", entityType: "User", entityId: targetId, metadata: { previousRole: target.role, newRole: role } } });
  });
  revalidatePath("/team"); revalidatePath("/dashboard"); redirect("/team?updated=1");
}

export async function overridePriorityAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const faultId = formString(formData, "faultId");
  const priority = formString(formData, "priority") as PriorityLevel;
  const reason = formString(formData, "reason").trim();
  if (!Object.values(PriorityLevel).includes(priority) || reason.length < 10 || reason.length > 500) redirect(`/faults/${faultId}?error=invalid-priority-override`);
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId } });
  if (!fault || ["RESTORED", "REJECTED", "CANCELLED"].includes(fault.status)) redirect(`/faults/${faultId}?error=closed-report`);
  await prisma.$transaction(async (tx) => {
    await tx.faultReport.update({ where: { id: faultId }, data: { priority, operatorOverrideReason: reason } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: fault.status, notes: `Priority changed from ${fault.priority} to ${priority}. Reason: ${reason}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "FAULT_PRIORITY_OVERRIDDEN", entityType: "FaultReport", entityId: faultId, metadata: { from: fault.priority, to: priority, reason } } });
  });
  revalidatePath(`/faults/${faultId}`); revalidatePath("/dashboard"); revalidatePath("/analytics"); redirect(`/faults/${faultId}`);
}
