import { describe, expect, it } from "vitest";
import { DEFAULT_RETENTION_DAYS, getRetentionCutoffs, getRetentionDays, parseRetentionDays } from "@/lib/privacy/retention";

describe("privacy retention policy", () => {
  it("uses documented defaults when no overrides are supplied", () => {
    expect(getRetentionDays({})).toEqual(DEFAULT_RETENTION_DAYS);
  });

  it("accepts positive bounded integer overrides", () => {
    expect(parseRetentionDays("90", 365)).toBe(90);
    expect(parseRetentionDays("0", 365)).toBe(365);
    expect(parseRetentionDays("3651", 365)).toBe(365);
    expect(parseRetentionDays("abc", 365)).toBe(365);
  });

  it("calculates date and epoch cutoffs from the same reference time", () => {
    const now = new Date("2026-11-16T12:00:00.000Z");
    const cutoffs = getRetentionCutoffs(now, DEFAULT_RETENTION_DAYS);
    expect(cutoffs.notifications.toISOString()).toBe("2025-11-16T12:00:00.000Z");
    expect(cutoffs.expiredSessions.toISOString()).toBe("2026-10-17T12:00:00.000Z");
    expect(cutoffs.rateLimits).toBe(BigInt(Date.parse("2026-11-09T12:00:00.000Z")));
  });
});
