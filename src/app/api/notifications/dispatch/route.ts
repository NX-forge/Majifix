import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authEmailTemplate, sendAuthEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Protected cron endpoint. Configure a scheduler to POST with the bearer secret. */
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_WORKER_SECRET;
  const authorization = request.headers.get("authorization");
  const suppliedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expected = Buffer.from(secret ?? "");
  const supplied = Buffer.from(suppliedSecret);
  const authorized = Boolean(secret && secret.length >= 32) && expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Recover claims left behind by a crashed worker.
  const staleClaim = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.notification.updateMany({
    where: { emailStatus: "SENDING", emailAttempts: { lt: 5 }, updatedAt: { lt: staleClaim } },
    data: { emailStatus: "PENDING" },
  });
  await prisma.notification.updateMany({
    where: { emailStatus: "SENDING", emailAttempts: { gte: 5 }, updatedAt: { lt: staleClaim } },
    data: { emailStatus: "FAILED", emailLastError: "Delivery worker stopped during the final allowed attempt." },
  });

  const pending = await prisma.notification.findMany({
    where: { emailStatus: "PENDING", emailAttempts: { lt: 5 } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  let sent = 0;
  let failed = 0;
  for (const notification of pending) {
    const claimed = await prisma.notification.updateMany({
      where: { id: notification.id, emailStatus: "PENDING" },
      data: { emailStatus: "SENDING", emailAttempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;

    try {
      const url = notification.href
        ? new URL(notification.href, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString()
        : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
      const template = authEmailTemplate(
        notification.title,
        `${notification.message}\n\nThis update relates to your MajiFix account.`,
        url,
        "View update",
      );
      await sendAuthEmail({
        to: notification.user.email,
        subject: notification.title,
        ...template,
      });
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailStatus: "SENT", emailSentAt: new Date(), emailLastError: null },
      });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown email delivery error";
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailStatus: notification.emailAttempts + 1 >= 5 ? "FAILED" : "PENDING",
          emailLastError: message,
        },
      });
      failed += 1;
      console.error("MajiFix notification email delivery failed.", { notificationId: notification.id, error });
    }
  }

  return NextResponse.json({ processed: sent + failed, sent, failed });
}
