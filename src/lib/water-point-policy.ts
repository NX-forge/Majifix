import { WaterPointStatus, type UserRole } from "@/generated/prisma/client";

export function canManageWaterPoint(input: {
  role: UserRole | string;
  userId: string;
  operatorId: string | null;
}): boolean {
  return input.role === "ADMIN" || (input.role === "OPERATOR" && input.operatorId === input.userId);
}

export function waterPointVisibilityWhere(input: {
  role: UserRole | string;
  userId: string;
}) {
  if (input.role === "OPERATOR") return { operatorId: input.userId };
  if (input.role === "TECHNICIAN") return { faults: { some: { repairJob: { is: { technicianId: input.userId } } } } };
  return {};
}

/**
 * A point with an active fault can become OPERATIONAL only through restoration
 * confirmation. When no active fault remains, an authorised inspection may
 * record an operational status with a reason.
 */
export function canManuallySetWaterPointStatus(status: WaterPointStatus | string, hasActiveFaults: boolean): boolean {
  if (status === "OPERATIONAL") return !hasActiveFaults;
  return status === "PARTIALLY_OPERATIONAL" || status === "NON_OPERATIONAL" || status === "UNKNOWN";
}


export function deriveWaterPointStatusFromActiveFaults(
  activeFaults: readonly { allServiceInterrupted: boolean }[],
): WaterPointStatus | null {
  if (activeFaults.length === 0) return null;
  return activeFaults.some((fault) => fault.allServiceInterrupted)
    ? WaterPointStatus.NON_OPERATIONAL
    : WaterPointStatus.PARTIALLY_OPERATIONAL;
}
