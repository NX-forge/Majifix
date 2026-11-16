import { describe, expect, it } from "vitest";
import { canManageWaterPoint, canManuallySetWaterPointStatus, deriveWaterPointStatusFromActiveFaults, waterPointVisibilityWhere } from "@/lib/water-point-policy";

describe("water-point access policy", () => {
  it("allows administrators to manage any water point", () => {
    expect(canManageWaterPoint({ role: "ADMIN", userId: "admin-1", operatorId: "operator-2" })).toBe(true);
  });

  it("allows operators to manage only water points assigned to them", () => {
    expect(canManageWaterPoint({ role: "OPERATOR", userId: "operator-1", operatorId: "operator-1" })).toBe(true);
    expect(canManageWaterPoint({ role: "OPERATOR", userId: "operator-1", operatorId: "operator-2" })).toBe(false);
    expect(canManageWaterPoint({ role: "OPERATOR", userId: "operator-1", operatorId: null })).toBe(false);
  });

  it("limits operator registry queries to assigned water points", () => {
    expect(waterPointVisibilityWhere({ role: "OPERATOR", userId: "operator-1" })).toEqual({ operatorId: "operator-1" });
  });

  it("limits technician registry queries to water points with their assigned jobs", () => {
    expect(waterPointVisibilityWhere({ role: "TECHNICIAN", userId: "tech-1" })).toEqual({
      faults: { some: { repairJob: { is: { technicianId: "tech-1" } } } },
    });
  });

  it("allows community members and administrators to browse the public registry", () => {
    expect(waterPointVisibilityWhere({ role: "COMMUNITY", userId: "community-1" })).toEqual({});
    expect(waterPointVisibilityWhere({ role: "ADMIN", userId: "admin-1" })).toEqual({});
  });

  it("derives water-point status from all active fault reports", () => {
    expect(deriveWaterPointStatusFromActiveFaults([])).toBeNull();
    expect(deriveWaterPointStatusFromActiveFaults([{ allServiceInterrupted: false }])).toBe("PARTIALLY_OPERATIONAL");
    expect(deriveWaterPointStatusFromActiveFaults([{ allServiceInterrupted: false }, { allServiceInterrupted: true }])).toBe("NON_OPERATIONAL");
  });

  it("allows an inspection to mark a point operational only when no active fault remains", () => {
    expect(canManuallySetWaterPointStatus("OPERATIONAL", true)).toBe(false);
    expect(canManuallySetWaterPointStatus("OPERATIONAL", false)).toBe(true);
    expect(canManuallySetWaterPointStatus("NON_OPERATIONAL", true)).toBe(true);
    expect(canManuallySetWaterPointStatus("PARTIALLY_OPERATIONAL", true)).toBe(true);
    expect(canManuallySetWaterPointStatus("UNKNOWN", true)).toBe(true);
  });
});
