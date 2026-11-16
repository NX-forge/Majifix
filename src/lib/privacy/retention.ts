export type RetentionDays = {
  notifications: number;
  expiredSessions: number;
  expiredVerifications: number;
  rateLimits: number;
};

export const DEFAULT_RETENTION_DAYS: RetentionDays = {
  notifications: 365,
  expiredSessions: 30,
  expiredVerifications: 30,
  rateLimits: 7,
};

export function parseRetentionDays(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 3650 ? parsed : fallback;
}

export function getRetentionDays(env: Record<string, string | undefined>): RetentionDays {
  return {
    notifications: parseRetentionDays(env.NOTIFICATION_RETENTION_DAYS, DEFAULT_RETENTION_DAYS.notifications),
    expiredSessions: parseRetentionDays(env.EXPIRED_SESSION_RETENTION_DAYS, DEFAULT_RETENTION_DAYS.expiredSessions),
    expiredVerifications: parseRetentionDays(env.EXPIRED_VERIFICATION_RETENTION_DAYS, DEFAULT_RETENTION_DAYS.expiredVerifications),
    rateLimits: parseRetentionDays(env.RATE_LIMIT_RETENTION_DAYS, DEFAULT_RETENTION_DAYS.rateLimits),
  };
}

export function getRetentionCutoffs(now: Date, days: RetentionDays) {
  const cutoff = (retentionDays: number) => new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return {
    notifications: cutoff(days.notifications),
    expiredSessions: cutoff(days.expiredSessions),
    expiredVerifications: cutoff(days.expiredVerifications),
    rateLimits: BigInt(cutoff(days.rateLimits).getTime()),
  };
}
