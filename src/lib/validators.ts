import { z } from "zod";

export const faultReportSchema = z.object({
  waterPointId: z.string().trim().min(1).max(100),
  category: z.enum(["MECHANICAL_FAILURE", "PUMP_FAILURE", "ELECTRICAL_FAILURE", "PIPE_LEAKAGE", "WATER_QUALITY_CONCERN", "LOW_YIELD", "OTHER"]),
  description: z.string().trim().min(10).max(2000),
  peopleAffected: z.preprocess((value) => value === "" || value === null || value === undefined ? Number.NaN : value, z.coerce.number().int().min(0).max(1000000)),
  downtimeHours: z.preprocess((value) => value === "" || value === null || value === undefined ? Number.NaN : value, z.coerce.number().int().min(0).max(8760)),
  allServiceInterrupted: z.boolean(),
  alternativeWaterAvailable: z.boolean(),
}).strict();

export const waterPointSchema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(3).max(120),
  type: z.enum(["BOREHOLE", "HANDPUMP", "MOTORISED_SYSTEM", "SPRING", "OTHER"]),
  county: z.string().trim().min(2).max(80),
  subCounty: z.string().trim().max(80).optional().or(z.literal("")),
  community: z.string().trim().max(100).optional().or(z.literal("")),
  latitude: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.coerce.number().min(-4.8).max(5.5).optional()),
  longitude: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.coerce.number().min(33.5).max(42.5).optional()),
  peopleServed: z.coerce.number().int().min(0).max(1000000),
  servesSchool: z.coerce.boolean(),
  servesHealthFacility: z.coerce.boolean(),
  alternativeWaterAvailable: z.coerce.boolean(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
}).superRefine((value, context) => {
  const hasLatitude = value.latitude !== undefined;
  const hasLongitude = value.longitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    context.addIssue({ code: "custom", message: "Provide both latitude and longitude, or leave both blank.", path: [hasLatitude ? "longitude" : "latitude"] });
  }
});

export const waterPointStatusChangeSchema = z.object({
  status: z.enum(["OPERATIONAL", "PARTIALLY_OPERATIONAL", "NON_OPERATIONAL", "UNKNOWN"]),
  reason: z.string().trim().min(10).max(500),
});
