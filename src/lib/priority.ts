import { PriorityLevel } from "@/generated/prisma/client";

export type PriorityInput = {
  peopleAffected: number;
  downtimeHours: number;
  servesSchool: boolean;
  servesHealthFacility: boolean;
  alternativeWaterAvailable: boolean;
  allServiceInterrupted: boolean;
};

/** Transparent rules-based score. This is a triage aid, not an AI diagnosis. */
export function calculatePriority(input: PriorityInput) {
  let score = 0;
  if (input.peopleAffected >= 500) score += 3;
  else if (input.peopleAffected >= 200) score += 2;
  else if (input.peopleAffected >= 50) score += 1;
  if (input.servesHealthFacility) score += 3;
  if (input.servesSchool) score += 2;
  if (input.downtimeHours >= 72) score += 3;
  else if (input.downtimeHours >= 24) score += 2;
  else if (input.downtimeHours >= 6) score += 1;
  if (!input.alternativeWaterAvailable) score += 2;
  if (input.allServiceInterrupted) score += 2;
  const level: PriorityLevel = score >= 8 ? "CRITICAL" : score >= 4 ? "HIGH" : "NORMAL";
  return { score, level };
}
