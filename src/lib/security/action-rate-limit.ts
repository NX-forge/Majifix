import type { PrismaClient } from "@/generated/prisma/client";
import { decideRateLimit } from "@/lib/security/rate-limit-policy";

const MAX_CONTENTION_RETRIES = 5;

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Database-backed per-user fixed-window limiter for server actions.
 * Conditional updates keep concurrent requests from incrementing past the limit.
 * Keys are namespaced so they cannot collide with Better Auth's own rate-limit keys.
 */
export async function consumeUserActionRateLimit(input: {
  userId: string;
  action: string;
  limit: number;
  windowMs: number;
  now?: number;
}, database?: Pick<PrismaClient, "rateLimit">): Promise<boolean> {
  const { userId, action, limit, windowMs } = input;
  const client = database ?? (await import("@/lib/prisma")).prisma;
  const now = input.now ?? Date.now();
  if (!userId || !action || !Number.isFinite(now) || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError("A user, action, positive limit and positive time window are required.");
  }

  const key = `majifix:action:${action}:${userId}`;
  const timestamp = BigInt(Math.trunc(now));

  for (let attempt = 0; attempt < MAX_CONTENTION_RETRIES; attempt += 1) {
    const current = await client.rateLimit.findUnique({ where: { key } });
    const decision = decideRateLimit(
      current ? { count: current.count, windowStartedAt: Number(current.lastRequest) } : null,
      now,
      windowMs,
      limit,
    );
    if (!decision.allowed) return false;

    if (!current) {
      try {
        await client.rateLimit.create({ data: { id: key, key, count: 1, lastRequest: timestamp } });
        return true;
      } catch (error) {
        if (isUniqueConstraintError(error)) continue;
        throw error;
      }
    }

    const startsNewWindow = decision.nextWindowStartedAt !== Number(current.lastRequest);
    const changed = await client.rateLimit.updateMany({
      where: { key, count: current.count, lastRequest: current.lastRequest },
      data: startsNewWindow
        ? { count: decision.nextCount, lastRequest: timestamp }
        : { count: { increment: 1 } },
    });
    if (changed.count === 1) return true;
  }

  // Fail closed under sustained contention instead of allowing unbounded writes.
  return false;
}
