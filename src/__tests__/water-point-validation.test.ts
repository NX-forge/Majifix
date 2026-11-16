import { describe, expect, it } from "vitest";
import { waterPointSchema, waterPointStatusChangeSchema } from "@/lib/validators";

const validWaterPoint = {
  code: "kit-bh-001",
  name: "Kavaini Community Borehole",
  type: "BOREHOLE",
  county: "Kitui",
  subCounty: "Kitui Central",
  community: "Kavaini",
  latitude: "-1.3667",
  longitude: "38.0106",
  peopleServed: "350",
  servesSchool: true,
  servesHealthFacility: false,
  alternativeWaterAvailable: false,
  notes: "Community borehole near the primary school.",
};

describe("water-point validation", () => {
  it("normalises codes and parses complete coordinates", () => {
    const result = waterPointSchema.safeParse(validWaterPoint);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("KIT-BH-001");
      expect(result.data.latitude).toBeCloseTo(-1.3667);
      expect(result.data.longitude).toBeCloseTo(38.0106);
    }
  });

  it("allows both coordinates to be blank", () => {
    const result = waterPointSchema.safeParse({ ...validWaterPoint, latitude: "", longitude: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBeUndefined();
      expect(result.data.longitude).toBeUndefined();
    }
  });

  it("rejects a single coordinate without its pair", () => {
    expect(waterPointSchema.safeParse({ ...validWaterPoint, longitude: "" }).success).toBe(false);
    expect(waterPointSchema.safeParse({ ...validWaterPoint, latitude: "" }).success).toBe(false);
  });

  it("rejects coordinates outside the configured Kenya bounds", () => {
    expect(waterPointSchema.safeParse({ ...validWaterPoint, latitude: "-20" }).success).toBe(false);
    expect(waterPointSchema.safeParse({ ...validWaterPoint, longitude: "50" }).success).toBe(false);
  });

  it("rejects malformed codes and invalid population counts", () => {
    expect(waterPointSchema.safeParse({ ...validWaterPoint, code: "WP/001" }).success).toBe(false);
    expect(waterPointSchema.safeParse({ ...validWaterPoint, peopleServed: "-1" }).success).toBe(false);
  });

  it("requires a reason for a manual status change", () => {
    expect(waterPointStatusChangeSchema.safeParse({ status: "UNKNOWN", reason: "Checked" }).success).toBe(false);
    expect(waterPointStatusChangeSchema.safeParse({ status: "UNKNOWN", reason: "Inspection completed at the site." }).success).toBe(true);
    expect(waterPointStatusChangeSchema.safeParse({ status: "OPERATIONAL", reason: "Inspection completed at the site." }).success).toBe(true);
  });
});
