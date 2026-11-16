import type { Prisma } from "@/generated/prisma/client";

export type AnalyticsRole = "ADMIN" | "OPERATOR" | "TECHNICIAN" | "COMMUNITY";

/** Database-level report scope. UI visibility is never used as an access boundary. */
export function buildFaultReportScope(role: AnalyticsRole, userId: string): Prisma.FaultReportWhereInput {
  if (role === "COMMUNITY") return { reporterId: userId };
  if (role === "TECHNICIAN") return { repairJob: { is: { technicianId: userId } } };
  if (role === "OPERATOR") return { waterPoint: { is: { operatorId: userId } } };
  return {};
}

/** Registry scope for the dashboard and analytics water-point count. */
export function buildWaterPointScope(role: AnalyticsRole, userId: string): Prisma.WaterPointWhereInput {
  if (role === "OPERATOR") return { operatorId: userId };
  if (role === "COMMUNITY") return { faults: { some: { reporterId: userId } } };
  if (role === "TECHNICIAN") return { faults: { some: { repairJob: { is: { technicianId: userId } } } } };
  return {};
}

/** Repair-job scope avoids a self-relation query for technicians. */
export function buildRepairJobScope(
  role: AnalyticsRole,
  userId: string,
  from: Date,
  to: Date,
): Prisma.RepairJobWhereInput {
  const reportScope: Prisma.FaultReportWhereInput = role === "COMMUNITY"
    ? { reporterId: userId }
    : role === "OPERATOR"
      ? { waterPoint: { is: { operatorId: userId } } }
      : {};
  return {
    ...(role === "TECHNICIAN" ? { technicianId: userId } : {}),
    faultReport: { is: { ...reportScope, createdAt: { gte: from, lt: to } } },
  };
}
