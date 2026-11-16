export type TimedRecord = {
  createdAt: Date;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  restoredAt?: Date | null;
};

export type DurationSummary = {
  count: number;
  averageHours: number | null;
  medianHours: number | null;
};

/** Returns a duration only when both timestamps are valid and ordered. */
export function durationHours(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null;
  const milliseconds = end.getTime() - start.getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return null;
  return milliseconds / 3_600_000;
}

export function summarizeDurations(values: Array<number | null | undefined>): DurationSummary {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (valid.length === 0) return { count: 0, averageHours: null, medianHours: null };
  const middle = Math.floor(valid.length / 2);
  const median = valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
  return {
    count: valid.length,
    averageHours: valid.reduce((sum, value) => sum + value, 0) / valid.length,
    medianHours: median,
  };
}

export function getDateRange(fromValue?: string, toValue?: string, now = new Date()) {
  const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;
  const parseKenyaDate = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const utcCalendarDate = new Date(Date.UTC(year, month - 1, day));
    if (utcCalendarDate.getUTCFullYear() !== year || utcCalendarDate.getUTCMonth() !== month - 1 || utcCalendarDate.getUTCDate() !== day) return null;
    return new Date(utcCalendarDate.getTime() - KENYA_OFFSET_MS);
  };
  const kenyaToday = new Date(now.getTime() + KENYA_OFFSET_MS);
  const todayInput = `${kenyaToday.getUTCFullYear()}-${String(kenyaToday.getUTCMonth() + 1).padStart(2, "0")}-${String(kenyaToday.getUTCDate()).padStart(2, "0")}`;
  const todayStart = parseKenyaDate(todayInput)!;
  const end = toValue ? (() => {
    const selected = parseKenyaDate(toValue);
    return selected ? new Date(selected.getTime() + 86_400_000) : new Date(todayStart.getTime() + 86_400_000);
  })() : new Date(todayStart.getTime() + 86_400_000);
  const from = parseKenyaDate(fromValue);
  const to = parseKenyaDate(toValue);
  const malformed = Boolean((fromValue && !from) || (toValue && !to));
  const start = from ?? new Date(end.getTime() - 30 * 86_400_000);
  const toInput = toValue && to ? toValue : todayInput;
  const fromInput = from ? fromValue! : (() => {
    const local = new Date(start.getTime() + KENYA_OFFSET_MS);
    return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
  })();

  if (start >= end || malformed) {
    const fallbackStart = new Date(end.getTime() - 30 * 86_400_000);
    const local = new Date(fallbackStart.getTime() + KENYA_OFFSET_MS);
    const fallbackFromInput = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
    return { from: fallbackStart, to: end, fromInput: fallbackFromInput, toInput, invalid: true };
  }
  return { from: start, to: end, fromInput, toInput, invalid: false };
}

export function percentage(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

export function formatMetricHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}
