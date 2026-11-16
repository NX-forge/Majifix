import { describe, expect, it } from "vitest";
import { buildFaultReportScope, buildRepairJobScope, buildWaterPointScope } from "./scope";

describe("analytics access scopes", () => {
  it("limits community reports to the submitting account", () => {
    expect(buildFaultReportScope("COMMUNITY", "community-1")).toEqual({ reporterId: "community-1" });
    expect(buildWaterPointScope("COMMUNITY", "community-1")).toEqual({ faults: { some: { reporterId: "community-1" } } });
  });

  it("limits operator reports and water points to assigned assets", () => {
    expect(buildFaultReportScope("OPERATOR", "operator-1")).toEqual({ waterPoint: { is: { operatorId: "operator-1" } } });
    expect(buildWaterPointScope("OPERATOR", "operator-1")).toEqual({ operatorId: "operator-1" });
  });

  it("limits technician reports and jobs to that technician", () => {
    expect(buildFaultReportScope("TECHNICIAN", "tech-1")).toEqual({ repairJob: { is: { technicianId: "tech-1" } } });
    expect(buildWaterPointScope("TECHNICIAN", "tech-1")).toEqual({ faults: { some: { repairJob: { is: { technicianId: "tech-1" } } } } });
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-02-01T00:00:00Z");
    expect(buildRepairJobScope("TECHNICIAN", "tech-1", from, to)).toEqual({
      technicianId: "tech-1",
      faultReport: { is: { createdAt: { gte: from, lt: to } } },
    });
  });

  it("leaves platform-wide scope to administrators", () => {
    expect(buildFaultReportScope("ADMIN", "admin-1")).toEqual({});
    expect(buildWaterPointScope("ADMIN", "admin-1")).toEqual({});
  });
});
