"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AccountStatus, FaultStatus, PriorityLevel, UserRole, WaterPointStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { canConfirmRestoration, wouldRemoveLastActiveAdministrator } from "@/lib/access-control";
import { calculatePriority } from "@/lib/priority";
import { canManageFault, canSubmitFault } from "@/lib/fault-access";
import { validateFaultEvidence, type ValidatedFaultEvidence } from "@/lib/fault-evidence";
import { faultReportSchema, waterPointSchema, waterPointStatusChangeSchema } from "@/lib/validators";
import { canManuallySetWaterPointStatus, deriveWaterPointStatusFromActiveFaults } from "@/lib/water-point-policy";
import { canManageRepair, canTechnicianRespondToAssignment, canTechnicianWorkOnRepair, isTechnicianRepairTransitionAllowed, isRepairCostCleared, isValidRepairEstimate, isValidRepairNote, technicianCoversAreas } from "@/lib/repair-policy";
import { repairAssignmentDecisionSchema, repairCostDecisionSchema, repairDelaySchema, repairEstimateSchema, resolveRepairDelaySchema } from "@/lib/repair-validators";
import { safelyNotifyFaultParticipants, safelyNotifyUsers } from "@/lib/notifications/service";
import { consumeUserActionRateLimit } from "@/lib/security/action-rate-limit";

function formString(formData: FormData, key: string) { return String(formData.get(key) ?? ""); }

async function enforceActionRateLimit(userId: string, action: string, limit = 60) {
  if (!await consumeUserActionRateLimit({ userId, action, limit, windowMs: 60 * 60 * 1000 })) {
    redirect("/dashboard?error=rate-limited");
  }
}
function formBool(formData: FormData, key: string) { return formData.get(key) === "on" || formData.get(key) === "true"; }
function makeReference() { return `MF-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`; }

function readWaterPointForm(formData: FormData) {
  return {
    code: formString(formData, "code"),
    name: formString(formData, "name"),
    type: formString(formData, "type"),
    county: formString(formData, "county"),
    subCounty: formString(formData, "subCounty"),
    community: formString(formData, "community"),
    latitude: formString(formData, "latitude"),
    longitude: formString(formData, "longitude"),
    peopleServed: formString(formData, "peopleServed"),
    servesSchool: formBool(formData, "servesSchool"),
    servesHealthFacility: formBool(formData, "servesHealthFacility"),
    alternativeWaterAvailable: formBool(formData, "alternativeWaterAvailable"),
    notes: formString(formData, "notes"),
  };
}

function waterPointWriteData(data: ReturnType<typeof waterPointSchema.parse>) {
  return {
    ...data,
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    subCounty: data.subCounty || null,
    community: data.community || null,
    notes: data.notes || null,
  };
}

export async function createWaterPointAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  if (!await consumeUserActionRateLimit({ userId: user.id, action: "water-point-create", limit: 10, windowMs: 60 * 60 * 1000 })) redirect("/water-points/new?error=rate-limited");
  const parsed = waterPointSchema.safeParse(readWaterPointForm(formData));
  if (!parsed.success) redirect("/water-points/new?error=invalid");

  let operatorId: string | null = user.id;
  if (user.role === "ADMIN") {
    const requestedOperatorId = formString(formData, "operatorId").trim();
    operatorId = null;
    if (requestedOperatorId) {
      const assignedOperator = await prisma.user.findFirst({ where: { id: requestedOperatorId, role: "OPERATOR", accountStatus: "ACTIVE" }, select: { id: true } });
      if (!assignedOperator) redirect("/water-points/new?error=invalid-operator");
      operatorId = assignedOperator.id;
    }
  }

  try {
    const point = await prisma.$transaction(async (tx) => {
      const created = await tx.waterPoint.create({ data: { ...waterPointWriteData(parsed.data), operatorId } });
      await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "WATER_POINT_CREATED", entityType: "WaterPoint", entityId: created.id, metadata: { code: created.code, county: created.county, operatorId } } });
      return created;
    });
    revalidatePath("/water-points");
    revalidatePath("/dashboard");
    redirect(`/water-points/${point.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") redirect("/water-points/new?error=duplicate-code");
    throw error;
  }
}

export async function updateWaterPointAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const waterPointId = formString(formData, "waterPointId");
  if (!await consumeUserActionRateLimit({ userId: user.id, action: "water-point-update", limit: 30, windowMs: 60 * 60 * 1000 })) redirect(`/water-points/${waterPointId}/edit?error=rate-limited`);
  const parsed = waterPointSchema.safeParse(readWaterPointForm(formData));
  if (!parsed.success) redirect(`/water-points/${waterPointId}/edit?error=invalid`);

  const existing = await prisma.waterPoint.findFirst({ where: { id: waterPointId, ...(user.role === "OPERATOR" ? { operatorId: user.id } : {}) } });
  if (!existing) redirect("/water-points?error=not-found");

  let assignment: { operatorId?: string | null } = {};
  if (user.role === "ADMIN") {
    const requestedOperatorId = formString(formData, "operatorId").trim();
    if (requestedOperatorId) {
      const assignedOperator = await prisma.user.findFirst({ where: { id: requestedOperatorId, role: "OPERATOR", accountStatus: "ACTIVE" }, select: { id: true } });
      if (!assignedOperator) redirect(`/water-points/${waterPointId}/edit?error=invalid-operator`);
      assignment = { operatorId: assignedOperator.id };
    } else {
      assignment = { operatorId: null };
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.waterPoint.updateMany({ where: { id: waterPointId, ...(user.role === "OPERATOR" ? { operatorId: user.id } : {}) }, data: { ...waterPointWriteData(parsed.data), ...assignment } });
      if (updateResult.count !== 1) return null;
      const record = await tx.waterPoint.findUniqueOrThrow({ where: { id: waterPointId } });
      await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "WATER_POINT_UPDATED", entityType: "WaterPoint", entityId: record.id, metadata: { code: record.code, operatorId: record.operatorId } } });
      return record;
    });
    if (!updated) redirect("/water-points?error=not-found");
    revalidatePath("/water-points");
    revalidatePath(`/water-points/${waterPointId}`);
    revalidatePath("/dashboard");
    redirect(`/water-points/${waterPointId}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") redirect(`/water-points/${waterPointId}/edit?error=duplicate-code`);
    throw error;
  }
}

export async function updateWaterPointStatusAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  const waterPointId = formString(formData, "waterPointId");
  if (!await consumeUserActionRateLimit({ userId: user.id, action: "water-point-status", limit: 30, windowMs: 60 * 60 * 1000 })) redirect(`/water-points/${waterPointId}?error=rate-limited`);
  const parsed = waterPointStatusChangeSchema.safeParse({ status: formString(formData, "status"), reason: formString(formData, "reason") });
  if (!parsed.success) redirect(`/water-points/${waterPointId}?error=invalid-status`);

  const point = await prisma.waterPoint.findFirst({ where: { id: waterPointId, ...(user.role === "OPERATOR" ? { operatorId: user.id } : {}) } });
  if (!point) redirect("/water-points?error=not-found");
  if (point.status === parsed.data.status) redirect(`/water-points/${waterPointId}?error=status-unchanged`);

  const outcome = await prisma.$transaction(async (tx) => {
    const activeFaultCount = await tx.faultReport.count({ where: { waterPointId, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } });
    if (!canManuallySetWaterPointStatus(parsed.data.status, activeFaultCount > 0)) return "active-fault" as const;
    const updateResult = await tx.waterPoint.updateMany({ where: { id: waterPointId, status: point.status, ...(user.role === "OPERATOR" ? { operatorId: user.id } : {}) }, data: { status: parsed.data.status } });
    if (updateResult.count !== 1) return "conflict" as const;
    await tx.waterPointStatusChange.create({ data: { waterPointId, previousStatus: point.status, newStatus: parsed.data.status, reason: parsed.data.reason, changedById: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "WATER_POINT_STATUS_CHANGED", entityType: "WaterPoint", entityId: waterPointId, metadata: { previousStatus: point.status, newStatus: parsed.data.status, reason: parsed.data.reason } } });
    return "updated" as const;
  }, { isolationLevel: "Serializable" });

  if (outcome === "active-fault") redirect(`/water-points/${waterPointId}?error=operational-requires-confirmation`);
  if (outcome === "conflict") redirect(`/water-points/${waterPointId}?error=status-conflict`);
  revalidatePath("/water-points");
  revalidatePath(`/water-points/${waterPointId}`);
  revalidatePath("/dashboard");
  redirect(`/water-points/${waterPointId}`);
}

export async function createFaultReportAction(formData: FormData) {
  const { user } = await requireUser();
  if (!canSubmitFault(user.role)) redirect("/dashboard?error=forbidden");

  const parsed = faultReportSchema.safeParse({
    waterPointId: formString(formData, "waterPointId"),
    category: formString(formData, "category"),
    description: formString(formData, "description"),
    peopleAffected: formString(formData, "peopleAffected"),
    downtimeHours: formString(formData, "downtimeHours"),
    allServiceInterrupted: formBool(formData, "allServiceInterrupted"),
    alternativeWaterAvailable: formBool(formData, "alternativeWaterAvailable"),
  });
  if (!parsed.success) redirect("/faults/new?error=invalid");

  let evidence: ValidatedFaultEvidence | null;
  try {
    evidence = await validateFaultEvidence(formData.get("evidence"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "INVALID_EVIDENCE";
    redirect(`/faults/new?error=${reason === "EVIDENCE_TOO_LARGE" ? "evidence-too-large" : reason === "EVIDENCE_EMPTY" ? "evidence-empty" : "unsupported-evidence"}`);
  }

  const pointWhere = {
    id: parsed.data.waterPointId,
    ...(user.role === "OPERATOR" ? { operatorId: user.id } : {}),
  };
  const point = await prisma.waterPoint.findFirst({ where: pointWhere });
  if (!point) redirect("/faults/new?error=water-point-not-found");

  const result = await prisma.$transaction(async (tx) => {
    // Recheck ownership and duplicate submissions inside the write transaction.
    const currentPoint = await tx.waterPoint.findFirst({ where: pointWhere });
    if (!currentPoint) return { kind: "missing" as const };
    const priority = calculatePriority({
      peopleAffected: parsed.data.peopleAffected,
      downtimeHours: parsed.data.downtimeHours,
      servesSchool: currentPoint.servesSchool,
      servesHealthFacility: currentPoint.servesHealthFacility,
      alternativeWaterAvailable: parsed.data.alternativeWaterAvailable,
      allServiceInterrupted: parsed.data.allServiceInterrupted,
    });

    const duplicate = await tx.faultReport.findFirst({
      where: {
        reporterId: user.id,
        waterPointId: currentPoint.id,
        category: parsed.data.category,
        status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] },
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, reference: true },
    });
    if (duplicate) return { kind: "duplicate" as const, reference: duplicate.reference };

    // Atomic fixed-window throttle: concurrent submissions cannot exceed 10 per user per hour.
    const now = new Date();
    const windowCutoff = new Date(now.getTime() - 60 * 60 * 1000);
    await tx.faultSubmissionWindow.upsert({
      where: { userId: user.id },
      create: { userId: user.id, windowStartedAt: now, count: 0 },
      update: { updatedAt: now },
    });
    await tx.faultSubmissionWindow.updateMany({
      where: { userId: user.id, windowStartedAt: { lt: windowCutoff } },
      data: { windowStartedAt: now, count: 0 },
    });
    const throttleUpdate = await tx.faultSubmissionWindow.updateMany({
      where: { userId: user.id, windowStartedAt: { gte: windowCutoff }, count: { lt: 10 } },
      data: { count: { increment: 1 } },
    });
    if (throttleUpdate.count !== 1) return { kind: "rate-limited" as const };

    const created = await tx.faultReport.create({
      data: {
        ...parsed.data,
        reference: makeReference(),
        reporterId: user.id,
        priority: priority.level,
        priorityScore: priority.score,
        priorityFactors: priority.factors,
        updates: { create: { authorId: user.id, status: "REPORTED", notes: "Fault report submitted." } },
      },
    });

    if (evidence) {
      await tx.faultEvidence.create({
        data: {
          faultReportId: created.id,
          uploadedById: user.id,
          originalName: evidence.originalName,
          mimeType: evidence.mimeType,
          sizeBytes: evidence.sizeBytes,
          data: Buffer.from(evidence.data),
        },
      });
    }

    const activeFaults = await tx.faultReport.findMany({
      where: { waterPointId: currentPoint.id, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } },
      select: { allServiceInterrupted: true },
    });
    const nextStatus = deriveWaterPointStatusFromActiveFaults(activeFaults);
    if (nextStatus && currentPoint.status !== nextStatus) {
      await tx.waterPoint.update({ where: { id: currentPoint.id }, data: { status: nextStatus } });
      await tx.waterPointStatusChange.create({
        data: {
          waterPointId: currentPoint.id,
          previousStatus: currentPoint.status,
          newStatus: nextStatus,
          reason: `Automatically recalculated after fault report ${created.reference}.`,
          changedById: user.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "FAULT_REPORTED",
        entityType: "FaultReport",
        entityId: created.id,
        metadata: { reference: created.reference, priority: priority.level, priorityScore: priority.score, evidenceAttached: Boolean(evidence) },
      },
    });
    return { kind: "created" as const, id: created.id };
  });

  if (result.kind === "missing") redirect("/faults/new?error=water-point-not-found");
  if (result.kind === "rate-limited") redirect("/faults/new?error=rate-limited");
  if (result.kind === "duplicate") redirect(`/faults/new?duplicate=${encodeURIComponent(result.reference)}`);

  await safelyNotifyFaultParticipants(result.id, { type: "FAULT_UPDATE", title: "Fault report received", message: "Your fault report has been received and is awaiting review." });
  revalidatePath("/dashboard");
  revalidatePath("/faults");
  revalidatePath("/water-points");
  redirect(`/faults/${result.id}`);
}

export async function assessFaultAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  await enforceActionRateLimit(user.id, "fault-assessment", 60);
  const faultId = formString(formData, "faultId");
  const decision = formString(formData, "decision");
  const notes = formString(formData, "notes").trim();
  const costRaw = formString(formData, "estimatedCost").trim();
  const cost = costRaw === "" ? undefined : Number(costRaw);

  if (!faultId || notes.length < 4 || notes.length > 1000) redirect(`/faults/${faultId}?error=invalid`);
  if (cost !== undefined && (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000_000)) redirect(`/faults/${faultId}?error=invalid-cost`);

  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true } });
  if (!fault || !canManageFault(user, fault)) redirect("/faults?error=not-found");
  if (!["ASSESS", "APPROVE", "REJECT"].includes(decision)) redirect(`/faults/${faultId}?error=invalid-decision`);
  if (!["REPORTED", "UNDER_ASSESSMENT"].includes(fault.status)) redirect(`/faults/${faultId}?error=invalid-decision`);
  if (decision === "ASSESS" && fault.status !== "REPORTED") redirect(`/faults/${faultId}?error=invalid-assessment`);

  const nextStatus: FaultStatus = decision === "ASSESS" ? "UNDER_ASSESSMENT" : decision === "REJECT" ? "REJECTED" : "APPROVED";
  await prisma.$transaction(async (tx) => {
    const currentFault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true } });
    if (!currentFault || currentFault.status !== fault.status || !canManageFault(user, currentFault)) throw new Error("FAULT_ACCESS_OR_STATUS_CHANGED");
    const updated = await tx.faultReport.updateMany({
      where: { id: faultId, status: fault.status },
      data: { status: nextStatus, ...(decision === "REJECT" ? { rejectedReason: notes } : {}) },
    });
    if (updated.count !== 1) throw new Error("FAULT_STATUS_CHANGED_CONCURRENTLY");

    if (decision === "APPROVE") {
      await tx.repairJob.upsert({
        where: { faultReportId: faultId },
        create: { faultReportId: faultId, ...(cost !== undefined ? { estimatedCost: cost, approvedCost: cost, costApprovalStatus: "APPROVED", costApprovalReason: "Estimate recorded by the approving operator.", costReviewedById: user.id } : {}) },
        update: { ...(cost !== undefined ? { estimatedCost: cost, approvedCost: cost, costApprovalStatus: "APPROVED", costApprovalReason: "Estimate recorded by the approving operator.", costReviewedById: user.id } : {}) },
      });
    }
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: nextStatus, notes } });

    if (decision === "REJECT") {
      const activeFaults = await tx.faultReport.findMany({
        where: { waterPointId: fault.waterPointId, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } },
        select: { allServiceInterrupted: true },
      });
      const derivedStatus = deriveWaterPointStatusFromActiveFaults(activeFaults);
      if (derivedStatus) {
        const point = await tx.waterPoint.findUniqueOrThrow({ where: { id: fault.waterPointId } });
        if (point.status !== derivedStatus) {
          await tx.waterPoint.update({ where: { id: point.id }, data: { status: derivedStatus } });
          await tx.waterPointStatusChange.create({
            data: { waterPointId: point.id, previousStatus: point.status, newStatus: derivedStatus, reason: `Recalculated after report ${fault.reference} was rejected.`, changedById: user.id },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: decision === "REJECT" ? "FAULT_REJECTED" : decision === "ASSESS" ? "FAULT_ASSESSED" : "FAULT_APPROVED",
        entityType: "FaultReport",
        entityId: faultId,
        metadata: { from: fault.status, to: nextStatus, estimatedCost: cost ?? null },
      },
    });
  });

  await safelyNotifyFaultParticipants(faultId, { type: "FAULT_UPDATE", title: decision === "REJECT" ? "Fault report rejected" : decision === "ASSESS" ? "Fault report under assessment" : "Fault report approved", message: decision === "REJECT" ? `Your report was rejected. ${notes}` : decision === "ASSESS" ? "Your report is now under assessment." : "Your fault report has been approved for repair." }, user.id);
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  revalidatePath("/dashboard");
  revalidatePath("/water-points");
  redirect(`/faults/${faultId}`);
}

export async function assignTechnicianAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  await enforceActionRateLimit(user.id, "technician-assignment", 30);
  const faultId = formString(formData, "faultId").trim();
  const technicianId = formString(formData, "technicianId").trim();
  const assignmentReason = formString(formData, "assignmentReason").trim();
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true, repairJob: true } });
  const isReassignment = Boolean(fault?.repairJob && (fault.repairJob.technicianId || fault.repairJob.assignmentStatus === "DECLINED"));
  const eligibleStatuses = isReassignment ? ["APPROVED", "REOPENED", "ASSIGNED", "IN_PROGRESS"] : ["APPROVED", "REOPENED"];
  if (!fault || !canManageFault(user, fault) || !eligibleStatuses.includes(fault.status) || (isReassignment && (assignmentReason.length < 10 || assignmentReason.length > 500))) redirect(`/faults/${faultId}?error=invalid-assignment`);

  const technician = await prisma.user.findFirst({
    where: { id: technicianId, role: "TECHNICIAN", accountStatus: "ACTIVE", technicianProfile: { is: { available: true } } },
    include: { technicianProfile: true },
  });
  if (!technician?.technicianProfile) redirect(`/faults/${faultId}?error=invalid-assignment`);
  const requiredAreas = [fault.waterPoint.county, fault.waterPoint.subCounty].filter((area): area is string => Boolean(area));
  if (!technicianCoversAreas(technician.technicianProfile.serviceAreas, requiredAreas)) redirect(`/faults/${faultId}?error=technician-outside-service-area`);

  try {
    await prisma.$transaction(async (tx) => {
    const currentFault = await tx.faultReport.findFirst({ where: { id: faultId, status: fault.status }, include: { waterPoint: true, repairJob: true } });
    const currentTechnician = await tx.user.findFirst({ where: { id: technicianId, role: "TECHNICIAN", accountStatus: "ACTIVE", technicianProfile: { is: { available: true } } }, include: { technicianProfile: true } });
    if (!currentFault || !canManageFault(user, currentFault) || !currentTechnician?.technicianProfile || currentFault.repairJob?.technicianId !== fault.repairJob?.technicianId || currentFault.repairJob?.assignmentStatus !== fault.repairJob?.assignmentStatus) throw new Error("FAULT_OR_TECHNICIAN_CHANGED_CONCURRENTLY");
    const currentRequiredAreas = [currentFault.waterPoint.county, currentFault.waterPoint.subCounty].filter((area): area is string => Boolean(area));
    if (!technicianCoversAreas(currentTechnician.technicianProfile.serviceAreas, currentRequiredAreas)) throw new Error("TECHNICIAN_SERVICE_AREA_CHANGED");

    const now = new Date();
    const reservation = await tx.technicianProfile.updateMany({ where: { userId: technicianId, available: true }, data: { available: false } });
    if (reservation.count !== 1) throw new Error("TECHNICIAN_NO_LONGER_AVAILABLE");
    const previousTechnicianId = currentFault.repairJob?.technicianId ?? null;
    const job = await tx.repairJob.upsert({
      where: { faultReportId: faultId },
      create: { faultReportId: faultId, technicianId, assignedAt: now, assignmentStatus: "PENDING" },
      update: {
        technicianId,
        assignedAt: now,
        assignmentStatus: "PENDING",
        acceptedAt: null,
        declinedAt: null,
        declineReason: null,
        startedAt: null,
        completedAt: null,
        restoredAt: null,
        ...(isReassignment ? { estimatedCost: null, approvedCost: null, costApprovalStatus: "NOT_SUBMITTED", costApprovalReason: null, costReviewedById: null } : {}),
      },
    });
    await tx.repairAssignmentHistory.updateMany({ where: { repairJobId: job.id, endedAt: null }, data: { endedAt: now, endReason: assignmentReason || "Assignment superseded by a new assignment." } });
    if (previousTechnicianId && previousTechnicianId !== technicianId) {
      const otherOpenAssignments = await tx.repairJob.count({ where: { technicianId: previousTechnicianId, id: { not: job.id }, faultReport: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } } });
      if (otherOpenAssignments === 0) await tx.technicianProfile.updateMany({ where: { userId: previousTechnicianId }, data: { available: true } });
    }
    await tx.repairAssignmentHistory.create({ data: { repairJobId: job.id, technicianId, assignedById: user.id, notes: isReassignment ? "Reassignment created by an authorised manager." : "Initial assignment created by an authorised manager." } });
    await tx.faultReport.update({ where: { id: faultId }, data: { status: "ASSIGNED" } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "ASSIGNED", notes: `${isReassignment ? `Reassigned to ${currentTechnician.name}. Reason: ${assignmentReason}` : `Assigned to ${currentTechnician.name}.` } Awaiting technician acceptance.` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: isReassignment ? "TECHNICIAN_REASSIGNED" : "TECHNICIAN_ASSIGNED", entityType: "RepairJob", entityId: job.id, metadata: { faultId, technicianId, technicianName: currentTechnician.name, reason: assignmentReason || null } } });
    });
  } catch (error) {
    if (error instanceof Error && ["TECHNICIAN_NO_LONGER_AVAILABLE", "FAULT_OR_TECHNICIAN_CHANGED_CONCURRENTLY"].includes(error.message)) redirect(`/faults/${faultId}?error=invalid-assignment`);
    if (error instanceof Error && ["TECHNICIAN_SERVICE_AREA_CHANGED"].includes(error.message)) redirect(`/faults/${faultId}?error=technician-outside-service-area`);
    throw error;
  }

  await safelyNotifyFaultParticipants(faultId, { type: "ASSIGNMENT", title: "Technician assigned", message: "A technician has been assigned to this repair and must respond to the assignment." }, user.id);
  if (fault.repairJob?.technicianId && fault.repairJob.technicianId !== technicianId) {
    await safelyNotifyUsers([fault.repairJob.technicianId], { type: "ASSIGNMENT", title: "Repair assignment reassigned", message: `You are no longer assigned to fault ${fault.reference}. The repair has been assigned to another technician.`, href: `/faults/${faultId}`, entityType: "FaultReport", entityId: faultId });
  }
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  revalidatePath("/technician/jobs");
  revalidatePath("/dashboard");
  redirect(`/faults/${faultId}`);
}

export async function acceptRepairAssignmentAction(formData: FormData) {
  const { user } = await requireUser(["TECHNICIAN"]);
  await enforceActionRateLimit(user.id, "assignment-response", 30);
  const faultId = formString(formData, "faultId").trim();
  if (!faultId) redirect("/technician/jobs?error=invalid-assignment");
  try {
    await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
    if (!fault?.repairJob || fault.status !== "ASSIGNED" || !canTechnicianRespondToAssignment(user, fault.repairJob.technicianId) || fault.repairJob.assignmentStatus !== "PENDING") throw new Error("ASSIGNMENT_NOT_PENDING");
    const changed = await tx.repairJob.updateMany({ where: { id: fault.repairJob.id, technicianId: user.id, assignmentStatus: "PENDING" }, data: { assignmentStatus: "ACCEPTED", acceptedAt: new Date(), declinedAt: null, declineReason: null } });
    if (changed.count !== 1) throw new Error("ASSIGNMENT_CHANGED_CONCURRENTLY");
    await tx.technicianProfile.updateMany({ where: { userId: user.id }, data: { available: false } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "ASSIGNED", notes: "Technician accepted the repair assignment." } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_ASSIGNMENT_ACCEPTED", entityType: "RepairJob", entityId: fault.repairJob.id, metadata: { faultId } } });
    });
  } catch (error) {
    if (error instanceof Error && ["ASSIGNMENT_NOT_PENDING", "ASSIGNMENT_CHANGED_CONCURRENTLY"].includes(error.message)) redirect("/technician/jobs?error=invalid-assignment");
    throw error;
  }
  await safelyNotifyFaultParticipants(faultId, { type: "ASSIGNMENT", title: "Technician accepted assignment", message: "The assigned technician has accepted the repair." }, user.id);
  revalidatePath("/technician/jobs");
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/dashboard");
  redirect("/technician/jobs?accepted=1");
}

export async function declineRepairAssignmentAction(formData: FormData) {
  const { user } = await requireUser(["TECHNICIAN"]);
  await enforceActionRateLimit(user.id, "assignment-response", 30);
  const parsed = repairAssignmentDecisionSchema.safeParse({ faultId: formString(formData, "faultId"), reason: formString(formData, "reason") });
  if (!parsed.success || !parsed.data.reason || parsed.data.reason.length < 10) redirect("/technician/jobs?error=invalid-decline-reason");
  const { faultId, reason } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true } });
    if (!fault?.repairJob || fault.status !== "ASSIGNED" || !canTechnicianRespondToAssignment(user, fault.repairJob.technicianId) || fault.repairJob.assignmentStatus !== "PENDING") throw new Error("ASSIGNMENT_NOT_PENDING");
    const now = new Date();
    const changed = await tx.repairJob.updateMany({ where: { id: fault.repairJob.id, technicianId: user.id, assignmentStatus: "PENDING" }, data: { technicianId: null, assignedAt: null, assignmentStatus: "DECLINED", declinedAt: now, declineReason: reason } });
    if (changed.count !== 1) throw new Error("ASSIGNMENT_CHANGED_CONCURRENTLY");
    await tx.repairAssignmentHistory.updateMany({ where: { repairJobId: fault.repairJob.id, technicianId: user.id, endedAt: null }, data: { endedAt: now, endReason: reason } });
    await tx.faultReport.update({ where: { id: faultId }, data: { status: "APPROVED" } });
    const otherOpenAssignments = await tx.repairJob.count({ where: { technicianId: user.id, id: { not: fault.repairJob.id }, faultReport: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } } });
    if (otherOpenAssignments === 0) await tx.technicianProfile.updateMany({ where: { userId: user.id }, data: { available: true } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: "APPROVED", notes: `Technician declined the assignment. Reason: ${reason}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_ASSIGNMENT_DECLINED", entityType: "RepairJob", entityId: fault.repairJob.id, metadata: { faultId, reason } } });
    });
  } catch (error) {
    if (error instanceof Error && ["ASSIGNMENT_NOT_PENDING", "ASSIGNMENT_CHANGED_CONCURRENTLY"].includes(error.message)) redirect("/technician/jobs?error=invalid-assignment");
    throw error;
  }
  await safelyNotifyFaultParticipants(faultId, { type: "ASSIGNMENT", title: "Technician declined assignment", message: `The technician declined the assignment. Reason: ${reason}` }, user.id);
  revalidatePath("/technician/jobs");
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  redirect("/technician/jobs?declined=1");
}

export async function submitRepairEstimateAction(formData: FormData) {
  const { user } = await requireUser(["TECHNICIAN"]);
  await enforceActionRateLimit(user.id, "repair-estimate-submit", 30);
  const parsed = repairEstimateSchema.safeParse({ faultId: formString(formData, "faultId"), estimatedCost: formString(formData, "estimatedCost"), notes: formString(formData, "notes") });
  if (!parsed.success || !isValidRepairEstimate(parsed.data.estimatedCost) || !isValidRepairNote(parsed.data.notes)) redirect(`/faults/${formString(formData, "faultId")}?error=invalid-estimate`);
  const { faultId, estimatedCost, notes } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
    if (!fault?.repairJob || !canTechnicianWorkOnRepair(user, { technicianId: fault.repairJob.technicianId, operatorId: fault.waterPoint.operatorId, assignmentStatus: fault.repairJob.assignmentStatus }) || !["ASSIGNED", "IN_PROGRESS"].includes(fault.status)) throw new Error("REPAIR_ESTIMATE_FORBIDDEN");
    await tx.repairJob.update({ where: { id: fault.repairJob.id }, data: { estimatedCost, approvedCost: null, costApprovalStatus: "PENDING", costApprovalReason: null, costReviewedById: null } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: fault.status, notes: `Repair estimate submitted: KES ${estimatedCost.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. ${notes}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_ESTIMATE_SUBMITTED", entityType: "RepairJob", entityId: fault.repairJob.id, metadata: { faultId, estimatedCost } } });
  });
  await safelyNotifyFaultParticipants(faultId, { type: "COST_DECISION", title: "Repair estimate submitted", message: `The technician submitted a repair estimate of KES ${estimatedCost.toLocaleString("en-KE")}. It is awaiting review.` }, user.id);
  revalidatePath(`/faults/${faultId}`);
  redirect(`/faults/${faultId}?estimate=submitted`);
}

export async function decideRepairEstimateAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  await enforceActionRateLimit(user.id, "repair-estimate-decision", 30);
  const parsed = repairCostDecisionSchema.safeParse({ faultId: formString(formData, "faultId"), decision: formString(formData, "decision"), reason: formString(formData, "reason") });
  if (!parsed.success) redirect(`/faults/${formString(formData, "faultId")}?error=invalid-cost-decision`);
  const { faultId, decision, reason } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
    if (!fault?.repairJob || !canManageFault(user, fault) || fault.repairJob.estimatedCost === null || fault.repairJob.costApprovalStatus !== "PENDING") throw new Error("REPAIR_COST_NOT_PENDING");
    const approved = decision === "APPROVE";
    const changed = await tx.repairJob.updateMany({ where: { id: fault.repairJob.id, costApprovalStatus: "PENDING" }, data: { costApprovalStatus: approved ? "APPROVED" : "REJECTED", approvedCost: approved ? fault.repairJob.estimatedCost : null, costApprovalReason: reason, costReviewedById: user.id } });
    if (changed.count !== 1) throw new Error("REPAIR_COST_CHANGED_CONCURRENTLY");
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: fault.status, notes: `Repair estimate ${approved ? "approved" : "rejected"}. ${reason}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: approved ? "REPAIR_ESTIMATE_APPROVED" : "REPAIR_ESTIMATE_REJECTED", entityType: "RepairJob", entityId: fault.repairJob.id, metadata: { faultId, estimatedCost: Number(fault.repairJob.estimatedCost), reason } } });
  });
  await safelyNotifyFaultParticipants(faultId, { type: "COST_DECISION", title: `Repair estimate ${decision.toLowerCase()}d`, message: `The repair estimate was ${decision.toLowerCase()}d. ${reason}` }, user.id);
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  redirect(`/faults/${faultId}?estimate=${decision.toLowerCase()}d`);
}

export async function reportRepairDelayAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR", "TECHNICIAN"]);
  await enforceActionRateLimit(user.id, "repair-delay-report", 30);
  const rawExpected = formString(formData, "expectedResolutionAt");
  const parsed = repairDelaySchema.safeParse({
    faultId: formString(formData, "faultId"), reason: formString(formData, "reason"), description: formString(formData, "description"),
    partName: formString(formData, "partName"), quantity: formString(formData, "quantity"), supplier: formString(formData, "supplier"), expectedResolutionAt: rawExpected ? new Date(`${rawExpected}:00+03:00`) : undefined,
  });
  if (!parsed.success) redirect(`/faults/${formString(formData, "faultId")}?error=invalid-delay`);
  const { faultId, reason, description, partName, quantity, supplier, expectedResolutionAt } = parsed.data;
  if (expectedResolutionAt && expectedResolutionAt.getTime() < Date.now() - 60_000) redirect(`/faults/${faultId}?error=invalid-delay-date`);
  await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
    if (!fault?.repairJob || !["ASSIGNED", "IN_PROGRESS"].includes(fault.status)) throw new Error("REPAIR_NOT_ACTIVE");
    const allowed = user.role === "TECHNICIAN"
      ? canTechnicianWorkOnRepair(user, { technicianId: fault.repairJob.technicianId, operatorId: fault.waterPoint.operatorId, assignmentStatus: fault.repairJob.assignmentStatus })
      : canManageRepair(user, { operatorId: fault.waterPoint.operatorId, technicianId: fault.repairJob.technicianId });
    if (!allowed) throw new Error("REPAIR_DELAY_FORBIDDEN");
    const delay = await tx.repairDelay.create({ data: { repairJobId: fault.repairJob.id, reportedById: user.id, reason, description, partName: partName || null, quantity: quantity ?? null, supplier: supplier || null, expectedResolutionAt: expectedResolutionAt ?? null } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: fault.status, notes: `Repair delay reported (${reason.replaceAll("_", " ")}). ${description}${partName ? ` Part: ${partName}.` : ""}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_DELAY_REPORTED", entityType: "RepairDelay", entityId: delay.id, metadata: { faultId, reason, partName: partName || null } } });
  });
  await safelyNotifyFaultParticipants(faultId, { type: "DELAY_UPDATE", title: "Repair delay reported", message: `A repair delay was reported: ${description}` }, user.id);
  revalidatePath(`/faults/${faultId}`);
  redirect(`/faults/${faultId}?delay=reported`);
}

export async function resolveRepairDelayAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR", "TECHNICIAN"]);
  await enforceActionRateLimit(user.id, "repair-delay-resolution", 30);
  const parsed = resolveRepairDelaySchema.safeParse({ delayId: formString(formData, "delayId"), resolutionNotes: formString(formData, "resolutionNotes") });
  if (!parsed.success) redirect("/faults?error=invalid-delay-resolution");
  const delay = await prisma.repairDelay.findUnique({ where: { id: parsed.data.delayId }, include: { repairJob: { include: { faultReport: { include: { waterPoint: true } } } } } });
  if (!delay || delay.resolvedAt) redirect("/faults?error=delay-not-found");
  const fault = delay.repairJob.faultReport;
  const allowed = user.role === "TECHNICIAN"
    ? canTechnicianWorkOnRepair(user, { technicianId: delay.repairJob.technicianId, operatorId: fault.waterPoint.operatorId, assignmentStatus: delay.repairJob.assignmentStatus })
    : canManageRepair(user, { operatorId: fault.waterPoint.operatorId, technicianId: delay.repairJob.technicianId });
  if (!allowed) redirect("/dashboard?error=forbidden");
  await prisma.$transaction(async (tx) => {
    const currentDelay = await tx.repairDelay.findUnique({ where: { id: delay.id }, include: { repairJob: { include: { faultReport: { include: { waterPoint: true } } } } } });
    if (!currentDelay || currentDelay.resolvedAt) throw new Error("DELAY_ALREADY_RESOLVED");
    const currentFault = currentDelay.repairJob.faultReport;
    const currentAllowed = user.role === "TECHNICIAN"
      ? canTechnicianWorkOnRepair(user, { technicianId: currentDelay.repairJob.technicianId, operatorId: currentFault.waterPoint.operatorId, assignmentStatus: currentDelay.repairJob.assignmentStatus })
      : canManageRepair(user, { operatorId: currentFault.waterPoint.operatorId, technicianId: currentDelay.repairJob.technicianId });
    if (!currentAllowed) throw new Error("REPAIR_DELAY_FORBIDDEN");
    const changed = await tx.repairDelay.updateMany({ where: { id: delay.id, resolvedAt: null }, data: { resolvedAt: new Date(), resolutionNotes: parsed.data.resolutionNotes } });
    if (changed.count !== 1) throw new Error("DELAY_ALREADY_RESOLVED");
    await tx.repairUpdate.create({ data: { faultReportId: currentFault.id, authorId: user.id, status: currentFault.status, notes: `Repair delay resolved: ${parsed.data.resolutionNotes}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_DELAY_RESOLVED", entityType: "RepairDelay", entityId: delay.id, metadata: { faultId: currentFault.id } } });
  });
  await safelyNotifyFaultParticipants(fault.id, { type: "DELAY_UPDATE", title: "Repair delay resolved", message: `A reported repair delay has been resolved. ${parsed.data.resolutionNotes}` }, user.id);
  revalidatePath(`/faults/${fault.id}`);
  redirect(`/faults/${fault.id}?delay=resolved`);
}

export async function addRepairEvidenceAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR", "TECHNICIAN"]);
  if (!await consumeUserActionRateLimit({ userId: user.id, action: "repair-evidence-upload", limit: 20, windowMs: 60 * 60 * 1000 })) redirect(`/faults/${formString(formData, "faultId").trim()}?error=rate-limited`);
  const faultId = formString(formData, "faultId").trim();
  const caption = formString(formData, "caption").trim();
  if (caption.length > 300) redirect(`/faults/${faultId}?error=invalid-evidence-caption`);
  let evidence: ValidatedFaultEvidence | null;
  try { evidence = await validateFaultEvidence(formData.get("evidence")); }
  catch (error) {
    const reason = error instanceof Error ? error.message : "INVALID_EVIDENCE";
    redirect(`/faults/${faultId}?error=${reason === "EVIDENCE_TOO_LARGE" ? "evidence-too-large" : "unsupported-evidence"}`);
  }
  if (!evidence) redirect(`/faults/${faultId}?error=evidence-required`);
  await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
    if (!fault?.repairJob) throw new Error("REPAIR_JOB_NOT_FOUND");
    const allowed = user.role === "TECHNICIAN"
      ? canTechnicianWorkOnRepair(user, { technicianId: fault.repairJob.technicianId, operatorId: fault.waterPoint.operatorId, assignmentStatus: fault.repairJob.assignmentStatus })
      : canManageRepair(user, { operatorId: fault.waterPoint.operatorId, technicianId: fault.repairJob.technicianId });
    if (!allowed) throw new Error("REPAIR_EVIDENCE_FORBIDDEN");
    const created = await tx.repairEvidence.create({ data: { repairJobId: fault.repairJob.id, uploadedById: user.id, originalName: evidence!.originalName, mimeType: evidence!.mimeType, sizeBytes: evidence!.sizeBytes, data: Buffer.from(evidence!.data), caption: caption || null } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: fault.status, notes: `Repair evidence added${caption ? `: ${caption}` : "."}` } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_EVIDENCE_ADDED", entityType: "RepairEvidence", entityId: created.id, metadata: { faultId, mimeType: evidence!.mimeType, sizeBytes: evidence!.sizeBytes } } });
  });
  revalidatePath(`/faults/${faultId}`);
  redirect(`/faults/${faultId}?evidence=added`);
}

export async function updateRepairStatusAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR", "TECHNICIAN"]);
  await enforceActionRateLimit(user.id, "repair-status-update", 60);
  const faultId = formString(formData, "faultId").trim();
  const nextStatus = formString(formData, "status") as FaultStatus;
  const notes = formString(formData, "notes").trim();
  if (!isValidRepairNote(notes) || !Object.values(FaultStatus).includes(nextStatus)) redirect(`/faults/${faultId}?error=invalid-update`);

  try {
    await prisma.$transaction(async (tx) => {
    const fault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true, repairJob: true } });
    if (!fault?.repairJob) throw new Error("NO_REPAIR_JOB");
    const manager = canManageRepair(user, { operatorId: fault.waterPoint.operatorId, technicianId: fault.repairJob.technicianId });
    const technician = canTechnicianWorkOnRepair(user, { technicianId: fault.repairJob.technicianId, operatorId: fault.waterPoint.operatorId, assignmentStatus: fault.repairJob.assignmentStatus });
    const allowed = technician
      ? isTechnicianRepairTransitionAllowed(fault.status, nextStatus)
      : manager && fault.status === "REPAIR_COMPLETED" && nextStatus === "AWAITING_CONFIRMATION";
    if (!allowed) throw new Error("REPAIR_TRANSITION_FORBIDDEN");
    if ((nextStatus === "IN_PROGRESS" || nextStatus === "REPAIR_COMPLETED" || nextStatus === "AWAITING_CONFIRMATION") && !isRepairCostCleared(fault.repairJob.costApprovalStatus)) throw new Error("REPAIR_ESTIMATE_NOT_APPROVED");
    if (nextStatus === "REPAIR_COMPLETED" || nextStatus === "AWAITING_CONFIRMATION") {
      const openDelays = await tx.repairDelay.count({ where: { repairJobId: fault.repairJob.id, resolvedAt: null } });
      if (openDelays > 0) throw new Error("OPEN_REPAIR_DELAYS");
    }

    const changed = await tx.faultReport.updateMany({ where: { id: faultId, status: fault.status }, data: { status: nextStatus } });
    if (changed.count !== 1) throw new Error("FAULT_STATUS_CHANGED_CONCURRENTLY");
    await tx.repairJob.update({ where: { id: fault.repairJob.id }, data: {
      ...(nextStatus === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
      ...(nextStatus === "REPAIR_COMPLETED" ? { completedAt: new Date() } : {}),
    } });
    if (nextStatus === "REPAIR_COMPLETED" && fault.repairJob.technicianId) {
      const otherOpenAssignments = await tx.repairJob.count({ where: { technicianId: fault.repairJob.technicianId, id: { not: fault.repairJob.id }, faultReport: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } } });
      if (otherOpenAssignments === 0) await tx.technicianProfile.updateMany({ where: { userId: fault.repairJob.technicianId }, data: { available: true } });
    }
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: nextStatus, notes } });
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "REPAIR_STATUS_UPDATED", entityType: "FaultReport", entityId: faultId, metadata: { from: fault.status, to: nextStatus } } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REPAIR_ESTIMATE_NOT_APPROVED") redirect(`/faults/${faultId}?error=repair-estimate-not-approved`);
    if (error instanceof Error && error.message === "OPEN_REPAIR_DELAYS") redirect(`/faults/${faultId}?error=open-repair-delays`);
    if (error instanceof Error && error.message === "REPAIR_TRANSITION_FORBIDDEN") redirect(`/faults/${faultId}?error=invalid-transition`);
    throw error;
  }

  await safelyNotifyFaultParticipants(faultId, { type: nextStatus === "AWAITING_CONFIRMATION" ? "RESTORATION" : "REPAIR_UPDATE", title: nextStatus === "IN_PROGRESS" ? "Repair started" : nextStatus === "REPAIR_COMPLETED" ? "Repair work completed" : "Repair update", message: nextStatus === "AWAITING_CONFIRMATION" ? "Repair work is complete. Please confirm whether water service has been restored." : `The repair status is now ${nextStatus.replaceAll("_", " ").toLowerCase()}.` }, user.id);
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  revalidatePath("/technician/jobs");
  revalidatePath("/dashboard");
  redirect(`/faults/${faultId}`);
}

export async function confirmRestorationAction(formData: FormData) {
  const { user } = await requireUser();
  await enforceActionRateLimit(user.id, "restoration-confirmation", 20);
  const faultId = formString(formData,"faultId"); const result = formString(formData,"result"); const notes = formString(formData,"notes").trim();
  if (notes.length > 1000) redirect(`/faults/${faultId}?error=invalid-confirmation`);
  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { repairJob: true, waterPoint: true } });
  if (!fault?.repairJob || fault.status !== "AWAITING_CONFIRMATION") redirect(`/faults/${faultId}?error=not-awaiting-confirmation`);
  if (!canConfirmRestoration({ role: user.role, reporterId: fault.reporterId, userId: user.id })) redirect("/dashboard?error=forbidden");
  if (user.role === "OPERATOR" && !canManageFault(user, fault)) redirect("/dashboard?error=forbidden");
  if (!["WATER_RESTORED", "NOT_RESTORED"].includes(result)) redirect(`/faults/${faultId}?error=invalid-confirmation`);
  const restored = result === "WATER_RESTORED";
  await prisma.$transaction(async (tx) => {
    const currentFault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true, repairJob: true } });
    if (!currentFault || currentFault.status !== "AWAITING_CONFIRMATION" || !currentFault.repairJob) throw new Error("FAULT_CONFIRMATION_ALREADY_SUBMITTED");
    if (!canConfirmRestoration({ role: user.role, reporterId: currentFault.reporterId, userId: user.id })) throw new Error("RESTORATION_CONFIRMATION_FORBIDDEN");
    if (user.role === "OPERATOR" && !canManageFault(user, currentFault)) throw new Error("RESTORATION_CONFIRMATION_FORBIDDEN");
    const changed = await tx.faultReport.updateMany({ where: { id: faultId, status: "AWAITING_CONFIRMATION" }, data: { status: restored ? "RESTORED" : "REOPENED" } });
    if (changed.count !== 1) throw new Error("FAULT_CONFIRMATION_ALREADY_SUBMITTED");
    await tx.restorationConfirmation.create({ data: { repairJobId: currentFault.repairJob.id, confirmedById: user.id, result: result as "WATER_RESTORED" | "NOT_RESTORED", notes: notes || undefined } });
    await tx.repairJob.update({ where: { id: currentFault.repairJob.id }, data: { restoredAt: restored ? new Date() : null } });
    await tx.repairUpdate.create({ data: { faultReportId: faultId, authorId: user.id, status: restored ? "RESTORED" : "REOPENED", notes: notes || (restored ? "Community confirmed water service is restored." : "Water service is not yet restored.") } });
    if (restored) {
      const remainingOpenFaults = await tx.faultReport.findMany({
        where: { waterPointId: currentFault.waterPointId, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } },
        select: { allServiceInterrupted: true },
      });
      const nextWaterPointStatus = deriveWaterPointStatusFromActiveFaults(remainingOpenFaults) ?? WaterPointStatus.OPERATIONAL;
      if (currentFault.waterPoint.status !== nextWaterPointStatus) {
        await tx.waterPoint.update({ where: { id: currentFault.waterPointId }, data: { status: nextWaterPointStatus } });
        await tx.waterPointStatusChange.create({ data: {
          waterPointId: currentFault.waterPointId,
          previousStatus: currentFault.waterPoint.status,
          newStatus: nextWaterPointStatus,
          reason: `Status recalculated after restoration confirmation for ${currentFault.reference}.`,
          changedById: user.id,
        } });
      }
    }
    await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "RESTORATION_CONFIRMED", entityType: "FaultReport", entityId: faultId, metadata: { result } } });
  });
  await safelyNotifyFaultParticipants(faultId, { type: "RESTORATION", title: restored ? "Water restoration confirmed" : "Water service not yet restored", message: restored ? "The community has confirmed that water service is restored." : "The community reported that water service is not yet restored. The repair has been reopened." }, user.id);
  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  revalidatePath("/dashboard");
  revalidatePath("/water-points");
  revalidatePath("/analytics");
  redirect(`/faults/${faultId}`);
}

export async function setUserRoleAction(formData: FormData) {
  const { user: actor } = await requireUser(["ADMIN"]);
  await enforceActionRateLimit(actor.id, "user-access-update", 30);
  const targetId = formString(formData, "userId").trim();
  const role = formString(formData, "role") as UserRole;
  const accountStatus = formString(formData, "accountStatus") as AccountStatus;
  const suspensionReason = formString(formData, "suspensionReason").trim();
  const parseProfileList = (raw: string) => Array.from(new Map(raw.split(",").map((value) => value.trim()).filter(Boolean).map((value) => [value.toLocaleLowerCase("en-KE"), value])).values());
  const skills = parseProfileList(formString(formData, "skills"));
  const serviceAreas = parseProfileList(formString(formData, "serviceAreas"));
  const available = formBool(formData, "available");
  if (role === "TECHNICIAN" && (skills.length > 20 || serviceAreas.length > 50 || skills.some((value) => value.length > 80) || serviceAreas.some((value) => value.length > 80))) redirect("/team?error=invalid-technician-profile");

  if (
    !targetId ||
    !Object.values(UserRole).includes(role) ||
    !Object.values(AccountStatus).includes(accountStatus) ||
    targetId === actor.id ||
    (accountStatus === "SUSPENDED" && (suspensionReason.length < 10 || suspensionReason.length > 500))
  ) {
    redirect("/team?error=invalid-access-change");
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) redirect("/team?error=user-not-found");
  if (accountStatus === "ACTIVE" && !target.emailVerified) redirect("/team?error=email-not-verified");

  if (target.role === "TECHNICIAN" && (role !== "TECHNICIAN" || accountStatus !== "ACTIVE" || available)) {
    const activeAssignments = await prisma.repairJob.count({
      where: { technicianId: targetId, assignmentStatus: { in: ["PENDING", "ACCEPTED"] }, faultReport: { status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } },
    });
    if (activeAssignments > 0 && (role !== "TECHNICIAN" || accountStatus !== "ACTIVE" || available)) redirect("/team?error=technician-has-active-assignments");
  }

  await prisma.$transaction(async (tx) => {
    const currentTarget = await tx.user.findUnique({ where: { id: targetId } });
    if (!currentTarget) throw new Error("USER_NOT_FOUND");
    if (accountStatus === "ACTIVE" && !currentTarget.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
    if (role === "TECHNICIAN" && (skills.length > 20 || serviceAreas.length > 50 || skills.some((value) => value.length > 80) || serviceAreas.some((value) => value.length > 80))) throw new Error("INVALID_TECHNICIAN_PROFILE");
    if (currentTarget.role === "TECHNICIAN" && (role !== "TECHNICIAN" || accountStatus !== "ACTIVE" || available)) {
      const activeAssignments = await tx.repairJob.count({ where: { technicianId: targetId, assignmentStatus: { in: ["PENDING", "ACCEPTED"] }, faultReport: { status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } } });
      if (activeAssignments > 0) throw new Error("TECHNICIAN_HAS_ACTIVE_ASSIGNMENTS");
    }

    const activeAdministratorCount = await tx.user.count({
      where: { role: "ADMIN", accountStatus: "ACTIVE" },
    });
    const removesLastAdministrator = wouldRemoveLastActiveAdministrator({
      currentRole: currentTarget.role,
      currentStatus: currentTarget.accountStatus,
      nextRole: role,
      nextStatus: accountStatus,
      activeAdministratorCount,
    });

    if (removesLastAdministrator) {
      throw new Error("LAST_ACTIVE_ADMINISTRATOR");
    }

    await tx.user.update({
      where: { id: targetId },
      data: {
        role,
        accountStatus,
        suspendedAt: accountStatus === "SUSPENDED" ? new Date() : null,
        suspensionReason: accountStatus === "SUSPENDED" ? suspensionReason : null,
      },
    });

    if (role === "TECHNICIAN") {
      await tx.technicianProfile.upsert({
        where: { userId: targetId },
        create: { userId: targetId, skills, serviceAreas, available: available && accountStatus === "ACTIVE" },
        update: { skills, serviceAreas, available: available && accountStatus === "ACTIVE" },
      });
    } else {
      await tx.technicianProfile.deleteMany({ where: { userId: targetId } });
    }

    // Revoke every active session after any access change so permissions take effect immediately.
    await tx.session.deleteMany({ where: { userId: targetId } });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "USER_ACCESS_UPDATED",
        entityType: "User",
        entityId: targetId,
        metadata: {
          previousRole: currentTarget.role,
          newRole: role,
          previousAccountStatus: currentTarget.accountStatus,
          newAccountStatus: accountStatus,
          suspensionReason: accountStatus === "SUSPENDED" ? suspensionReason : null,
        },
      },
    });
  }, { isolationLevel: "Serializable" }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "LAST_ACTIVE_ADMINISTRATOR") {
      redirect("/team?error=last-active-admin");
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      redirect("/team?error=user-not-found");
    }
    if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
      redirect("/team?error=email-not-verified");
    }
    if (error instanceof Error && error.message === "TECHNICIAN_HAS_ACTIVE_ASSIGNMENTS") {
      redirect("/team?error=technician-has-active-assignments");
    }
    if (error instanceof Error && error.message === "INVALID_TECHNICIAN_PROFILE") {
      redirect("/team?error=invalid-technician-profile");
    }
    throw error;
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  redirect("/team?updated=1");
}


export async function revokeOwnSessionAction(formData: FormData) {
  const { user, session: activeSession } = await requireUser();
  await enforceActionRateLimit(user.id, "session-revocation", 30);
  const sessionId = formString(formData, "sessionId").trim();
  if (!sessionId) redirect("/account/security?error=invalid-session");

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) redirect("/account/security?error=session-not-found");

  if (activeSession.id === sessionId) redirect("/account/security?error=current-session");

  await prisma.$transaction(async (tx) => {
    await tx.session.delete({ where: { id: sessionId } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "OWN_SESSION_REVOKED",
        entityType: "Session",
        entityId: sessionId,
      },
    });
  });

  revalidatePath("/account/security");
  redirect("/account/security?revoked=1");
}


export async function overridePriorityAction(formData: FormData) {
  const { user } = await requireUser(["ADMIN", "OPERATOR"]);
  await enforceActionRateLimit(user.id, "priority-override", 30);
  const faultId = formString(formData, "faultId");
  const priority = formString(formData, "priority") as PriorityLevel;
  const reason = formString(formData, "reason").trim();
  if (!Object.values(PriorityLevel).includes(priority) || reason.length < 10 || reason.length > 500) redirect(`/faults/${faultId}?error=invalid-priority-override`);

  const fault = await prisma.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true } });
  if (!fault || !canManageFault(user, fault)) redirect("/faults?error=not-found");
  if (["RESTORED", "REJECTED", "CANCELLED"].includes(fault.status)) redirect(`/faults/${faultId}?error=closed-report`);

  await prisma.$transaction(async (tx) => {
    const currentFault = await tx.faultReport.findUnique({ where: { id: faultId }, include: { waterPoint: true } });
    if (!currentFault || !canManageFault(user, currentFault) || currentFault.status !== fault.status || currentFault.priority !== fault.priority) throw new Error("FAULT_ACCESS_OR_PRIORITY_CHANGED");
    const updated = await tx.faultReport.updateMany({
      where: { id: faultId, status: fault.status, priority: fault.priority },
      data: { priority, operatorOverrideReason: reason },
    });
    if (updated.count !== 1) throw new Error("FAULT_CHANGED_CONCURRENTLY");
    await tx.repairUpdate.create({
      data: { faultReportId: faultId, authorId: user.id, status: fault.status, notes: `Priority changed from ${fault.priority} to ${priority}. Reason: ${reason}` },
    });
    await tx.auditLog.create({
      data: { actorId: user.id, actorEmail: user.email, action: "FAULT_PRIORITY_OVERRIDDEN", entityType: "FaultReport", entityId: faultId, metadata: { from: fault.priority, to: priority, originalScore: fault.priorityScore, reason } },
    });
  });

  revalidatePath(`/faults/${faultId}`);
  revalidatePath("/faults");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  redirect(`/faults/${faultId}`);
}
