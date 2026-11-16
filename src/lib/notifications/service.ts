import { prisma } from "@/lib/prisma";
import { getNotificationRecipients, isNotificationCategoryEnabled, type NotificationPreferenceFlags } from "@/lib/notifications/policy";

import type { NotificationInput } from "@/lib/notifications/types";

/** Notifications are written after the business transaction commits. Delivery errors never roll back repair work. */
export async function notifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (!recipients.length) return;

  const users = await prisma.user.findMany({
    where: { id: { in: recipients }, accountStatus: "ACTIVE" },
    select: { id: true, email: true },
  });
  if (!users.length) return;

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: { in: users.map((user) => user.id) } },
  }) as Array<NotificationPreferenceFlags & {
    userId: string;
    inAppEnabled: boolean;
    emailEnabled: boolean;
  }>;
  const preferenceByUser = new Map<string, NotificationPreferenceFlags & {
    inAppEnabled: boolean;
    emailEnabled: boolean;
  }>(preferences.map((preference) => [preference.userId, preference] as const));

  const notificationRows = users.flatMap((user) => {
    const preference = preferenceByUser.get(user.id);
    const categoryEnabled = isNotificationCategoryEnabled(preference, input.type);
    const inAppEnabled = preference?.inAppEnabled ?? true;
    const emailEnabled = preference?.emailEnabled ?? true;
    if (!categoryEnabled || (!inAppEnabled && !emailEnabled)) return [];
    return [{
      userId: user.id,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      inAppVisible: inAppEnabled,
      emailStatus: emailEnabled ? "PENDING" : "SKIPPED",
    }];
  });
  if (notificationRows.length) {
    await prisma.notification.createMany({ data: notificationRows });
  }
}

export async function notifyFaultParticipants(
  faultId: string,
  input: NotificationInput,
  excludeUserId?: string,
): Promise<void> {
  const fault = await prisma.faultReport.findUnique({
    where: { id: faultId },
    select: {
      id: true,
      reporterId: true,
      waterPoint: { select: { operatorId: true } },
      repairJob: { select: { technicianId: true } },
    },
  });
  if (!fault) return;
  const ids = getNotificationRecipients(fault.reporterId, fault.waterPoint.operatorId, fault.repairJob?.technicianId ?? null, excludeUserId);
  await notifyUsers(ids, {
    ...input,
    entityType: input.entityType ?? "FaultReport",
    entityId: input.entityId ?? fault.id,
    href: input.href ?? `/faults/${fault.id}`,
  });
}

export async function safelyNotifyFaultParticipants(
  faultId: string,
  input: NotificationInput,
  excludeUserId?: string,
): Promise<void> {
  try {
    await notifyFaultParticipants(faultId, input, excludeUserId);
  } catch (error) {
    console.error("MajiFix notification creation failed.", { faultId, type: input.type, error });
  }
}

export async function safelyNotifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  try {
    await notifyUsers(userIds, input);
  } catch (error) {
    console.error("MajiFix notification creation failed.", { type: input.type, error });
  }
}
