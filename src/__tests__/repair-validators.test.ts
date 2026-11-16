import { describe, expect, it } from "vitest";
import { repairCostDecisionSchema, repairDelaySchema, repairEstimateSchema, resolveRepairDelaySchema } from "@/lib/repair-validators";

describe("repair estimate validation", () => {
  it("accepts a non-negative KES estimate and meaningful notes", () => {
    expect(repairEstimateSchema.safeParse({ faultId: "fault-1", estimatedCost: "12500.50", notes: "Pump seal and labour estimate" }).success).toBe(true);
  });

  it("rejects negative, excessive and malformed estimates", () => {
    expect(repairEstimateSchema.safeParse({ faultId: "fault-1", estimatedCost: "-1", notes: "Estimate notes" }).success).toBe(false);
    expect(repairEstimateSchema.safeParse({ faultId: "fault-1", estimatedCost: "1000000001", notes: "Estimate notes" }).success).toBe(false);
    expect(repairEstimateSchema.safeParse({ faultId: "fault-1", estimatedCost: "abc", notes: "Estimate notes" }).success).toBe(false);
  });

  it("requires a reason for cost approval or rejection", () => {
    expect(repairCostDecisionSchema.safeParse({ faultId: "fault-1", decision: "APPROVE", reason: "Reviewed and approved" }).success).toBe(true);
    expect(repairCostDecisionSchema.safeParse({ faultId: "fault-1", decision: "REJECT", reason: "No" }).success).toBe(false);
  });
});

describe("repair delay validation", () => {
  it("requires a part name for spare-parts delays", () => {
    expect(repairDelaySchema.safeParse({ faultId: "fault-1", reason: "SPARE_PARTS_UNAVAILABLE", description: "The pump seal is not available" }).success).toBe(false);
    expect(repairDelaySchema.safeParse({ faultId: "fault-1", reason: "SPARE_PARTS_UNAVAILABLE", description: "The pump seal is not available", partName: "Pump seal", quantity: "2" }).success).toBe(true);
  });

  it("accepts other delay reasons without spare-part details", () => {
    expect(repairDelaySchema.safeParse({ faultId: "fault-1", reason: "TRANSPORT", description: "The technician vehicle is unavailable" }).success).toBe(true);
  });

  it("requires resolution notes", () => {
    expect(resolveRepairDelaySchema.safeParse({ delayId: "delay-1", resolutionNotes: "Part received and fitted" }).success).toBe(true);
    expect(resolveRepairDelaySchema.safeParse({ delayId: "delay-1", resolutionNotes: "ok" }).success).toBe(false);
  });
});
