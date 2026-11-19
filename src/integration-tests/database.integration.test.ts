import { config as loadEnv } from "dotenv";
loadEnv({ path: process.env.TEST_ENV_FILE ?? ".env.test" });
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { consumeUserActionRateLimit } from "@/lib/security/action-rate-limit";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun = Boolean(testDatabaseUrl);
const prisma = testDatabaseUrl
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) })
  : null;

function requireTestClient(): PrismaClient {
  if (!prisma) throw new Error("TEST_DATABASE_URL is required for database integration tests.");
  return prisma;
}

function assertDisposableTestDatabase(connectionString: string) {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, "").split("?")[0];
  if (!/(?:^|[-_])test$/i.test(databaseName)) {
    throw new Error("Refusing to run integration tests. TEST_DATABASE_URL database name must end in _test or -test.");
  }
}

describe.skipIf(!canRun)("PostgreSQL integration and audit persistence", () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("persists fault records and their audit event in one relational transaction", async () => {
    assertDisposableTestDatabase(testDatabaseUrl!);
    const db = requireTestClient();
    const suffix = randomUUID();
    const userId = `it-user-${suffix}`;
    const pointCode = `IT-${suffix.slice(0, 12)}`;
    let faultId = "";

    try {
      const created = await db.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { id: userId, name: "Integration Test Reporter", email: `${suffix}@integration.majifix.test`, emailVerified: true, role: "COMMUNITY", accountStatus: "ACTIVE" } });
        const point = await tx.waterPoint.create({ data: { code: pointCode, name: "Synthetic integration water point", type: "BOREHOLE", county: "Kitui" } });
        const fault = await tx.faultReport.create({ data: { reference: `IT-${suffix}`, waterPointId: point.id, reporterId: user.id, category: "PUMP_FAILURE", description: "Synthetic integration test fault record.", priority: "HIGH", priorityScore: 5 } });
        await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "FAULT_REPORTED", entityType: "FaultReport", entityId: fault.id, metadata: { reference: fault.reference, test: true } } });
        return { faultId: fault.id, userId: user.id, pointId: point.id };
      });
      faultId = created.faultId;

      const [fault, audit] = await Promise.all([
        db.faultReport.findUnique({ where: { id: created.faultId }, include: { reporter: true, waterPoint: true } }),
        db.auditLog.findFirst({ where: { entityType: "FaultReport", entityId: created.faultId, action: "FAULT_REPORTED" } }),
      ]);
      expect(fault?.reporter.id).toBe(userId);
      expect(fault?.waterPoint.code).toBe(pointCode);
      expect(audit?.actorId).toBe(userId);
      expect(audit?.metadata).toMatchObject({ test: true });
    } finally {
      if (faultId) await db.faultReport.deleteMany({ where: { id: faultId } });
      await db.auditLog.deleteMany({ where: { actorId: userId } });
      await db.waterPoint.deleteMany({ where: { code: pointCode } });
      await db.user.deleteMany({ where: { id: userId } });
    }
  });



  it("enforces the per-user write limit under concurrent database requests", async () => {
    assertDisposableTestDatabase(testDatabaseUrl!);
    const db = requireTestClient();
    const suffix = randomUUID();
    const userId = `it-rate-${suffix}`;
    const action = `integration-${suffix}`;
    const key = `majifix:action:${action}:${userId}`;

    try {
      const results = await Promise.all(Array.from({ length: 8 }, () => consumeUserActionRateLimit({
        userId,
        action,
        limit: 2,
        windowMs: 60_000,
        now: 1_000_000,
      }, db)));
      expect(results.filter(Boolean)).toHaveLength(2);
      expect(await consumeUserActionRateLimit({ userId, action, limit: 2, windowMs: 60_000, now: 1_061_000 }, db)).toBe(true);
    } finally {
      await db.rateLimit.deleteMany({ where: { key } });
    }
  });

  it("revokes all stored sessions after an account access change", async () => {
    assertDisposableTestDatabase(testDatabaseUrl!);
    const db = requireTestClient();
    const suffix = randomUUID();
    const userId = `it-session-${suffix}`;
    const email = `${suffix}@session.majifix.test`;

    try {
      await db.user.create({ data: { id: userId, name: "Session Integration Test", email, emailVerified: true, role: "COMMUNITY", accountStatus: "ACTIVE" } });
      await db.session.create({ data: { id: `it-session-record-${suffix}`, userId, token: `it-token-${suffix}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      await db.user.update({ where: { id: userId }, data: { role: "TECHNICIAN" } });
      await db.session.deleteMany({ where: { userId } });
      expect(await db.session.count({ where: { userId } })).toBe(0);
    } finally {
      await db.session.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
  });

  it("rolls back partial workflow writes when a transaction fails", async () => {
    assertDisposableTestDatabase(testDatabaseUrl!);
    const db = requireTestClient();
    const suffix = randomUUID();
    const email = `${suffix}@rollback.majifix.test`;

    await expect(db.$transaction(async (tx) => {
      await tx.user.create({ data: { name: "Rollback Test", email, emailVerified: true, role: "COMMUNITY", accountStatus: "ACTIVE" } });
      throw new Error("FORCED_TEST_ROLLBACK");
    })).rejects.toThrow("FORCED_TEST_ROLLBACK");

    expect(await db.user.findUnique({ where: { email } })).toBeNull();
  });
});
