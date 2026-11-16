import { describe, expect, it } from "vitest";
import { decideRateLimit } from "@/lib/security/rate-limit-policy";

describe("fixed-window rate-limit policy", () => {
  it("allows the first request and starts a window", () => {
    expect(decideRateLimit(null, 1_000, 60_000, 3)).toEqual({ allowed: true, nextCount: 1, nextWindowStartedAt: 1_000 });
  });

  it("allows requests up to the configured limit", () => {
    expect(decideRateLimit({ count: 2, windowStartedAt: 1_000 }, 2_000, 60_000, 3).nextCount).toBe(3);
  });

  it("blocks requests after the limit is reached", () => {
    expect(decideRateLimit({ count: 3, windowStartedAt: 1_000 }, 2_000, 60_000, 3).allowed).toBe(false);
  });

  it("resets the counter at the window boundary", () => {
    expect(decideRateLimit({ count: 3, windowStartedAt: 1_000 }, 61_000, 60_000, 3)).toEqual({ allowed: true, nextCount: 1, nextWindowStartedAt: 61_000 });
  });

  it("rejects invalid limiter configuration", () => {
    expect(() => decideRateLimit(null, 1, 0, 3)).toThrow(RangeError);
    expect(() => decideRateLimit(null, 1, 1_000, 0)).toThrow(RangeError);
  });
});
