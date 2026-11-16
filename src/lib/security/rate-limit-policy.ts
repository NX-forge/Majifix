export type RateLimitState = { count: number; windowStartedAt: number };
export type RateLimitDecision = { allowed: boolean; nextCount: number; nextWindowStartedAt: number };

/** Pure fixed-window policy used by the database-backed action limiter. */
export function decideRateLimit(
  state: RateLimitState | null,
  now: number,
  windowMs: number,
  limit: number,
): RateLimitDecision {
  if (!Number.isFinite(now) || !Number.isFinite(windowMs) || windowMs <= 0 || !Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Rate-limit time window and limit must be positive finite values.");
  }
  if (!state || now < state.windowStartedAt || now - state.windowStartedAt >= windowMs) {
    return { allowed: true, nextCount: 1, nextWindowStartedAt: now };
  }
  if (!Number.isInteger(state.count) || state.count < 0) {
    throw new RangeError("Rate-limit count must be a non-negative integer.");
  }
  if (state.count >= limit) {
    return { allowed: false, nextCount: state.count, nextWindowStartedAt: state.windowStartedAt };
  }
  return { allowed: true, nextCount: state.count + 1, nextWindowStartedAt: state.windowStartedAt };
}
