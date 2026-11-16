import { describe, expect, it } from "vitest";
import { calculatePriority, parsePriorityFactors, priorityLevelForScore } from "@/lib/priority";

const baseInput = {
  peopleAffected: 0,
  downtimeHours: 0,
  servesSchool: false,
  servesHealthFacility: false,
  alternativeWaterAvailable: true,
  allServiceInterrupted: false,
};

describe("calculatePriority", () => {
  it("marks a complete outage serving many people and a health facility critical", () => {
    const result = calculatePriority({
      peopleAffected: 600,
      downtimeHours: 80,
      servesSchool: true,
      servesHealthFacility: true,
      alternativeWaterAvailable: false,
      allServiceInterrupted: true,
    });
    expect(result.level).toBe("CRITICAL");
    expect(result.score).toBe(15);
    expect(result.factors.map((factor) => factor.key)).toEqual(["population", "health", "school", "downtime", "alternatives", "outage"]);
  });

  it("marks a small outage with an alternative source normal", () => {
    const result = calculatePriority({ ...baseInput, peopleAffected: 10, downtimeHours: 1 });
    expect(result.level).toBe("NORMAL");
    expect(result.score).toBe(0);
    expect(result.factors).toHaveLength(0);
  });

  it("marks moderate impact high at the documented threshold", () => {
    const result = calculatePriority({ ...baseInput, peopleAffected: 250, downtimeHours: 24 });
    expect(result.level).toBe("HIGH");
    expect(result.score).toBe(4);
  });

  it("marks a score of seven high and eight critical", () => {
    const seven = calculatePriority({ ...baseInput, peopleAffected: 500, downtimeHours: 24, servesSchool: true });
    const eight = calculatePriority({ ...baseInput, peopleAffected: 500, downtimeHours: 72, servesSchool: true });
    expect(seven.score).toBe(7);
    expect(seven.level).toBe("HIGH");
    expect(eight.score).toBe(8);
    expect(eight.level).toBe("CRITICAL");
  });

  it("includes only the factors that contribute to the score", () => {
    const result = calculatePriority({ ...baseInput, allServiceInterrupted: true, alternativeWaterAvailable: false });
    expect(result.score).toBe(4);
    expect(result.level).toBe("HIGH");
    expect(result.factors.map((factor) => factor.key)).toEqual(["alternatives", "outage"]);
  });
});


describe("priority snapshot helpers", () => {
  it("reads only well-formed priority factor records", () => {
    const factors = parsePriorityFactors([
      { key: "health", label: "Health facility served", points: 3, explanation: "Serves a health facility" },
      { key: "bad", label: "Bad", points: "three", explanation: "Invalid points type" },
      null,
    ]);
    expect(factors).toHaveLength(1);
    expect(factors[0].points).toBe(3);
  });

  it("maps stored score snapshots to the documented priority bands", () => {
    expect(priorityLevelForScore(3)).toBe("NORMAL");
    expect(priorityLevelForScore(4)).toBe("HIGH");
    expect(priorityLevelForScore(7)).toBe("HIGH");
    expect(priorityLevelForScore(8)).toBe("CRITICAL");
  });
});
