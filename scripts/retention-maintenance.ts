import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getRetentionCutoffs, getRetentionDays } from "../src/lib/privacy/retention";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for retention maintenance.");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const execute = process.argv.includes("--execute");
  if (execute && process.env.NODE_ENV === "production" && process.env.RETENTION_MAINTENANCE_CONFIRM !== "DELETE_EXPIRED_DATA") {
    throw new Error("Production deletion requires RETENTION_MAINTENANCE_CONFIRM=DELETE_EXPIRED_DATA.");
  }

  const days = getRetentionDays(process.env);
  const cutoffs = getRetentionCutoffs(new Date(), days);
  const where = {
    notifications: { createdAt: { lt: cutoffs.notifications } },
    expiredSessions: { expiresAt: { lt: cutoffs.expiredSessions } },
    expiredVerifications: { expiresAt: { lt: cutoffs.expiredVerifications } },
    rateLimits: { lastRequest: { lt: cutoffs.rateLimits } },
  };

  const counts = {
    notifications: await prisma.notification.count({ where: where.notifications }),
    expiredSessions: await prisma.session.count({ where: where.expiredSessions }),
    expiredVerifications: await prisma.verification.count({ where: where.expiredVerifications }),
    rateLimits: await prisma.rateLimit.count({ where: where.rateLimits }),
  };

  console.info(JSON.stringify({ mode: execute ? "execute" : "dry-run", retentionDays: days, eligibleRecords: counts }, null, 2));
  if (!execute) {
    console.info("Dry run only. Pass --execute to delete eligible records.");
    return;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const notifications = await tx.notification.deleteMany({ where: where.notifications });
    const sessions = await tx.session.deleteMany({ where: where.expiredSessions });
    const verifications = await tx.verification.deleteMany({ where: where.expiredVerifications });
    const rateLimits = await tx.rateLimit.deleteMany({ where: where.rateLimits });
    return {
      notifications: notifications.count,
      expiredSessions: sessions.count,
      expiredVerifications: verifications.count,
      rateLimits: rateLimits.count,
    };
  });
  console.info(JSON.stringify({ deleted }, null, 2));
  console.info("Audit logs, fault reports, repair records and evidence were not deleted.");
}

main().catch((error: unknown) => {
  console.error("Retention maintenance failed.", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
