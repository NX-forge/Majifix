import type { PriorityLevel } from "@/generated/prisma/client";

export type PriorityInput = {
  peopleAffected: number;
  downtimeHours: number;
  servesSchool: boolean;
  servesHealthFacility: boolean;
  alternativeWaterAvailable: boolean;
  allServiceInterrupted: boolean;
};

export type PriorityFactor = {
  key: string;
  label: string;
  points: number;
  explanation: string;
};

/**
 * Transparent rule-based triage. The score helps operators order work; it is
 * not a safety assessment, water-quality test, or substitute for judgement.
 */
export function calculatePriority(input: PriorityInput): {
  score: number;
  level: PriorityLevel;
  factors: PriorityFactor[];
} {
  const factors: PriorityFactor[] = [];
  const add = (key: string, label: string, points: number, explanation: string) => {
    if (points > 0) factors.push({ key, label, points, explanation });
  };

  if (input.peopleAffected >= 500) {
    add("population", "People affected", 3, "500 or more people affected");
  } else if (input.peopleAffected >= 200) {
    add("population", "People affected", 2, "200–499 people affected");
  } else if (input.peopleAffected >= 50) {
    add("population", "People affected", 1, "50–199 people affected");
  }

  if (input.servesHealthFacility) add("health", "Health facility served", 3, "The water point serves a health facility");
  if (input.servesSchool) add("school", "School served", 2, "The water point serves a school");

  if (input.downtimeHours >= 72) {
    add("downtime", "Downtime", 3, "Service interruption has lasted at least 72 hours");
  } else if (input.downtimeHours >= 24) {
    add("downtime", "Downtime", 2, "Service interruption has lasted 24–71 hours");
  } else if (input.downtimeHours >= 6) {
    add("downtime", "Downtime", 1, "Service interruption has lasted 6–23 hours");
  }

  if (!input.alternativeWaterAvailable) add("alternatives", "No alternative source", 2, "No alternative water source is available");
  if (input.allServiceInterrupted) add("outage", "Complete service interruption", 2, "All water service is interrupted");

  const score = factors.reduce((total, factor) => total + factor.points, 0);
  const level: PriorityLevel = score >= 8 ? "CRITICAL" : score >= 4 ? "HIGH" : "NORMAL";
  return { score, level, factors };
}


/** Safely read the immutable factor snapshot stored when a report is created. */
export function parsePriorityFactors(value: unknown): PriorityFactor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): PriorityFactor[] => {
    if (typeof item !== "object" || item === null) return [];
    const factor = item as Record<string, unknown>;
    if (typeof factor.key !== "string" || typeof factor.label !== "string" || typeof factor.points !== "number" || !Number.isFinite(factor.points) || typeof factor.explanation !== "string") return [];
    return [{ key: factor.key, label: factor.label, points: factor.points, explanation: factor.explanation }];
  });
}

export function priorityLevelForScore(score: number): PriorityLevel {
  return score >= 8 ? "CRITICAL" : score >= 4 ? "HIGH" : "NORMAL";
}
