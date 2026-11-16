import { describe, expect, it } from "vitest";
import type { FaultStatus } from "@/generated/prisma/client";
import {
  canManageRepair,
  canTechnicianRespondToAssignment,
  canTechnicianWorkOnRepair,
  isTechnicianRepairTransitionAllowed,
  isRepairCostCleared,
  isValidRepairEstimate,
  isValidRepairNote,
  technicianCoversAreas,
} from "@/lib/repair-policy";

describe("repair access policies", () => {
  it("allows administrators and only the assigned operator to manage a repair", () => {
    expect(canManageRepair({ id: "admin-1", role: "ADMIN" }, { operatorId: null, technicianId: null })).toBe(true);
    expect(canManageRepair({ id: "operator-1", role: "OPERATOR" }, { operatorId: "operator-1", technicianId: null })).toBe(true);
    expect(canManageRepair({ id: "operator-2", role: "OPERATOR" }, { operatorId: "operator-1", technicianId: null })).toBe(false);
  });

  it("requires the assigned technician and an accepted assignment before work", () => {
    const scope = { operatorId: "operator-1", technicianId: "tech-1", assignmentStatus: "ACCEPTED" };
    expect(canTechnicianWorkOnRepair({ id: "tech-1", role: "TECHNICIAN" }, scope)).toBe(true);
    expect(canTechnicianWorkOnRepair({ id: "tech-2", role: "TECHNICIAN" }, scope)).toBe(false);
    expect(canTechnicianWorkOnRepair({ id: "tech-1", role: "TECHNICIAN" }, { ...scope, assignmentStatus: "PENDING" })).toBe(false);
    expect(canTechnicianWorkOnRepair({ id: "operator-1", role: "OPERATOR" }, scope)).toBe(false);
  });

  it("lets only the assigned technician respond to an assignment", () => {
    expect(canTechnicianRespondToAssignment({ id: "tech-1", role: "TECHNICIAN" }, "tech-1")).toBe(true);
    expect(canTechnicianRespondToAssignment({ id: "tech-2", role: "TECHNICIAN" }, "tech-1")).toBe(false);
    expect(canTechnicianRespondToAssignment({ id: "tech-1", role: "OPERATOR" }, "tech-1")).toBe(false);
  });
});

describe("repair workflow policies", () => {
  it("allows only technician work transitions", () => {
    expect(isTechnicianRepairTransitionAllowed("ASSIGNED" as FaultStatus, "IN_PROGRESS" as FaultStatus)).toBe(true);
    expect(isTechnicianRepairTransitionAllowed("IN_PROGRESS" as FaultStatus, "REPAIR_COMPLETED" as FaultStatus)).toBe(true);
    expect(isTechnicianRepairTransitionAllowed("REPAIR_COMPLETED" as FaultStatus, "RESTORED" as FaultStatus)).toBe(false);
    expect(isTechnicianRepairTransitionAllowed("ASSIGNED" as FaultStatus, "RESTORED" as FaultStatus)).toBe(false);
  });

  it("requires submitted estimates to be approved before repair work continues", () => {
    expect(isRepairCostCleared("NOT_SUBMITTED")).toBe(true);
    expect(isRepairCostCleared("APPROVED")).toBe(true);
    expect(isRepairCostCleared("PENDING")).toBe(false);
    expect(isRepairCostCleared("REJECTED")).toBe(false);
  });

  it("normalises and checks service-area coverage", () => {
    expect(technicianCoversAreas([" Kitui ", "Mwingi"], ["KITUI", "Mwingi North"])).toBe(true);
    expect(technicianCoversAreas(["Nairobi"], ["Kitui"])).toBe(false);
    expect(technicianCoversAreas(["ALL"], ["Kitui"])).toBe(true);
    expect(technicianCoversAreas([], ["Kitui"])).toBe(false);
  });

  it("validates estimate amounts and repair notes", () => {
    expect(isValidRepairEstimate(0)).toBe(true);
    expect(isValidRepairEstimate(12500.5)).toBe(true);
    expect(isValidRepairEstimate(-1)).toBe(false);
    expect(isValidRepairEstimate(Number.NaN)).toBe(false);
    expect(isValidRepairEstimate(1_000_000_001)).toBe(false);
    expect(isValidRepairNote("Replace the pump seal")).toBe(true);
    expect(isValidRepairNote("no")).toBe(false);
    expect(isValidRepairNote("x".repeat(1001))).toBe(false);
  });
});
