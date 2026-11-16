import type { FaultStatus } from "@/generated/prisma/client";

export type RepairActor = { id: string; role: string };
export type RepairScope = { operatorId: string | null; technicianId: string | null };

const technicianTransitions: Partial<Record<FaultStatus, FaultStatus[]>> = {
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["REPAIR_COMPLETED"],
};

export function canManageRepair(actor: RepairActor, scope: RepairScope): boolean {
  return actor.role === "ADMIN" || (actor.role === "OPERATOR" && scope.operatorId === actor.id);
}

export function canTechnicianWorkOnRepair(actor: RepairActor, scope: RepairScope & { assignmentStatus: string }): boolean {
  return actor.role === "TECHNICIAN" && scope.technicianId === actor.id && scope.assignmentStatus === "ACCEPTED";
}

export function canTechnicianRespondToAssignment(actor: RepairActor, technicianId: string | null): boolean {
  return actor.role === "TECHNICIAN" && technicianId === actor.id;
}

export function isTechnicianRepairTransitionAllowed(from: FaultStatus, to: FaultStatus): boolean {
  return technicianTransitions[from]?.includes(to) ?? false;
}

export function normaliseServiceArea(value: string): string {
  return value.trim().toLocaleLowerCase("en-KE").replace(/\s+/g, " ");
}

export function technicianCoversAreas(serviceAreas: string[], requiredAreas: string[]): boolean {
  const allowed = serviceAreas.map(normaliseServiceArea).filter(Boolean);
  const required = requiredAreas.map(normaliseServiceArea).filter(Boolean);
  return allowed.includes("all") || required.some((area) => allowed.includes(area));
}

export function isValidRepairEstimate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
}

export function isValidRepairNote(value: string): boolean {
  return value.trim().length >= 4 && value.trim().length <= 1000;
}

export function isRepairCostCleared(status: string): boolean {
  return status !== "PENDING" && status !== "REJECTED";
}
