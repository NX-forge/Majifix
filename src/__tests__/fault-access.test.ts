import { describe, expect, it } from "vitest";
import { canManageFault, canSubmitFault, canViewFault, faultVisibilityWhere } from "@/lib/fault-access";

const fault = {
  reporterId: "community-1",
  waterPoint: { operatorId: "operator-1" },
  repairJob: { technicianId: "technician-1" },
};

describe("fault access policies", () => {
  it("limits community members to reports they submitted", () => {
    expect(canViewFault({ id: "community-1", role: "COMMUNITY" }, fault)).toBe(true);
    expect(canViewFault({ id: "community-2", role: "COMMUNITY" }, fault)).toBe(false);
    expect(faultVisibilityWhere({ id: "community-1", role: "COMMUNITY" })).toEqual({ reporterId: "community-1" });
  });

  it("limits operators to reports for their assigned water points", () => {
    expect(canViewFault({ id: "operator-1", role: "OPERATOR" }, fault)).toBe(true);
    expect(canViewFault({ id: "operator-2", role: "OPERATOR" }, fault)).toBe(false);
    expect(canManageFault({ id: "operator-2", role: "OPERATOR" }, fault)).toBe(false);
    expect(faultVisibilityWhere({ id: "operator-1", role: "OPERATOR" })).toEqual({ waterPoint: { is: { operatorId: "operator-1" } } });
  });

  it("limits technicians to reports assigned to them", () => {
    expect(canViewFault({ id: "technician-1", role: "TECHNICIAN" }, fault)).toBe(true);
    expect(canViewFault({ id: "technician-2", role: "TECHNICIAN" }, fault)).toBe(false);
  });

  it("allows administrators to view and manage all faults", () => {
    expect(canViewFault({ id: "admin-1", role: "ADMIN" }, fault)).toBe(true);
    expect(canManageFault({ id: "admin-1", role: "ADMIN" }, fault)).toBe(true);
    expect(faultVisibilityWhere({ id: "admin-1", role: "ADMIN" })).toEqual({});
  });

  it("allows fault submission for community, operator and admin roles only", () => {
    expect(canSubmitFault("COMMUNITY")).toBe(true);
    expect(canSubmitFault("OPERATOR")).toBe(true);
    expect(canSubmitFault("ADMIN")).toBe(true);
    expect(canSubmitFault("TECHNICIAN")).toBe(false);
  });
});
