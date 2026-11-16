import type { UserRole } from "@/generated/prisma/client";

export type FaultAccessActor = { id: string; role: UserRole | string };

export function faultVisibilityWhere(actor: FaultAccessActor) {
  switch (actor.role) {
    case "ADMIN":
      return {};
    case "OPERATOR":
      return { waterPoint: { is: { operatorId: actor.id } } };
    case "TECHNICIAN":
      return { repairJob: { is: { technicianId: actor.id } } };
    case "COMMUNITY":
    default:
      return { reporterId: actor.id };
  }
}

export function canViewFault(actor: FaultAccessActor, fault: {
  reporterId: string;
  waterPoint: { operatorId: string | null };
  repairJob: { technicianId: string | null } | null;
}): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "OPERATOR") return fault.waterPoint.operatorId === actor.id;
  if (actor.role === "TECHNICIAN") return fault.repairJob?.technicianId === actor.id;
  return fault.reporterId === actor.id;
}

export function canManageFault(actor: FaultAccessActor, fault: {
  waterPoint: { operatorId: string | null };
}): boolean {
  return actor.role === "ADMIN" || (actor.role === "OPERATOR" && fault.waterPoint.operatorId === actor.id);
}

export function canSubmitFault(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "OPERATOR" || role === "COMMUNITY";
}
