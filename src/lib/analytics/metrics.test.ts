import { describe, expect, it } from "vitest";
import { durationHours, formatMetricHours, getDateRange, percentage, summarizeDurations } from "./metrics";

describe("analytics metric helpers", () => {
  it("calculates non-negative durations and rejects missing or reversed dates", () => {
    expect(durationHours(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-02T12:00:00Z"))).toBe(36);
    expect(durationHours(null, new Date())).toBeNull();
    expect(durationHours(new Date("2026-01-02"), new Date("2026-01-01"))).toBeNull();
  });

  it("summarizes only valid durations", () => {
    expect(summarizeDurations([1, 3, 5, null, -2]).averageHours).toBe(3);
    expect(summarizeDurations([1, 3, 5, null, -2]).medianHours).toBe(3);
    expect(summarizeDurations([])).toEqual({ count: 0, averageHours: null, medianHours: null });
  });

  it("validates date filters and uses a 30-day default", () => {
    const now = new Date("2026-11-16T10:00:00Z");
    const range = getDateRange(undefined, undefined, now);
    expect(range.from.toISOString()).toBe("2026-10-17T21:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-16T21:00:00.000Z");
    expect(range.fromInput).toBe("2026-10-18");
    expect(range.toInput).toBe("2026-11-16");
    expect(getDateRange("2026-02-30", undefined, now).invalid).toBe(true);
    expect(getDateRange("2026-11-20", "2026-11-10", now).invalid).toBe(true);
  });

  it("handles zero denominators and formats durations", () => {
    expect(percentage(1, 0)).toBeNull();
    expect(percentage(1, 4)).toBe(25);
    expect(formatMetricHours(0.5)).toBe("30m");
    expect(formatMetricHours(48)).toBe("2.0d");
    expect(formatMetricHours(null)).toBe("—");
  });
});
