"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";

export async function markNotificationReadAction(formData: FormData) {
  const { user } = await requireUser();
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect("/notifications");
}

export async function markAllNotificationsReadAction() {
  const { user } = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, inAppVisible: true },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect("/notifications");
}

export async function saveNotificationPreferencesAction(formData: FormData) {
  const { user } = await requireUser();
  const booleanField = (name: string) => formData.get(name) === "on";
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      inAppEnabled: booleanField("inAppEnabled"),
      emailEnabled: booleanField("emailEnabled"),
      faultUpdates: booleanField("faultUpdates"),
      assignments: booleanField("assignments"),
      repairUpdates: booleanField("repairUpdates"),
      costDecisions: booleanField("costDecisions"),
      delayUpdates: booleanField("delayUpdates"),
      restoration: booleanField("restoration"),
    },
    update: {
      inAppEnabled: booleanField("inAppEnabled"),
      emailEnabled: booleanField("emailEnabled"),
      faultUpdates: booleanField("faultUpdates"),
      assignments: booleanField("assignments"),
      repairUpdates: booleanField("repairUpdates"),
      costDecisions: booleanField("costDecisions"),
      delayUpdates: booleanField("delayUpdates"),
      restoration: booleanField("restoration"),
    },
  });
  revalidatePath("/notifications");
  redirect("/notifications?preferences=saved");
}
