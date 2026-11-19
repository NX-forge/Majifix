import { describe, expect, it } from "vitest";
import { faultReportSchema, waterPointSchema } from "@/lib/validators";

const validFault = {
  waterPointId: "water-point-1",
  category: "PUMP_FAILURE",
  description: "The community water pump has stopped working.",
  peopleAffected: "120",
  downtimeHours: "8",
  allServiceInterrupted: true,
  alternativeWaterAvailable: false,
};

const validWaterPoint = {
  code: "KIT-BH-001",
  name: "Kavaini Community Borehole",
  type: "BOREHOLE",
  county: "Kitui",
  peopleServed: "120",
  servesSchool: false,
  servesHealthFacility: false,
  alternativeWaterAvailable: true,
  latitude: "",
  longitude: "",
};

describe("server input hardening", () => {
  it("rejects client attempts to set protected fault ownership and workflow fields", () => {
    const result = faultReportSchema.safeParse({
      ...validFault,
      reporterId: "another-user",
      status: "RESTORED",
      priority: "CRITICAL",
      priorityScore: 999,
    });
    expect(result.success).toBe(false);
  });

  it("does not carry client-supplied operator or operational status into parsed water-point data", () => {
    const result = waterPointSchema.safeParse({
      ...validWaterPoint,
      operatorId: "attacker-controlled-user",
      status: "OPERATIONAL",
      createdAt: "2099-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("operatorId");
      expect(result.data).not.toHaveProperty("status");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });
});
