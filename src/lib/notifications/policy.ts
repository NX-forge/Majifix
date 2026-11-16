import type { NotificationCategory } from "@/lib/notifications/types";

export type NotificationPreferenceFlags = {
  faultUpdates?: boolean;
  assignments?: boolean;
  repairUpdates?: boolean;
  costDecisions?: boolean;
  delayUpdates?: boolean;
  restoration?: boolean;
};

const categoryFlag: Record<NotificationCategory, keyof NotificationPreferenceFlags> = {
  FAULT_UPDATE: "faultUpdates",
  ASSIGNMENT: "assignments",
  REPAIR_UPDATE: "repairUpdates",
  COST_DECISION: "costDecisions",
  DELAY_UPDATE: "delayUpdates",
  RESTORATION: "restoration",
};

export function isNotificationCategoryEnabled(
  preferences: NotificationPreferenceFlags | null | undefined,
  category: NotificationCategory,
): boolean {
  return preferences?.[categoryFlag[category]] ?? true;
}

export function getNotificationRecipients(
  reporterId: string,
  operatorId: string | null,
  technicianId: string | null,
  excludeUserId?: string,
): string[] {
  return [...new Set([reporterId, operatorId, technicianId].filter(
    (id): id is string => Boolean(id) && id !== excludeUserId,
  ))];
}
