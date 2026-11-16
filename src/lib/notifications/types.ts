export type NotificationCategory =
  | "FAULT_UPDATE"
  | "ASSIGNMENT"
  | "REPAIR_UPDATE"
  | "COST_DECISION"
  | "DELAY_UPDATE"
  | "RESTORATION";

export type NotificationInput = {
  type: NotificationCategory;
  title: string;
  message: string;
  href?: string;
  entityType?: string;
  entityId?: string;
};
