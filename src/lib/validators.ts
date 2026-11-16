import { z } from "zod";

export const faultReportSchema = z.object({
  waterPointId: z.string().min(1),
  category: z.enum(["MECHANICAL_FAILURE", "PUMP_FAILURE", "ELECTRICAL_FAILURE", "PIPE_LEAKAGE", "WATER_QUALITY_CONCERN", "LOW_YIELD", "OTHER"]),
  description: z.string().trim().min(10).max(2000),
  peopleAffected: z.coerce.number().int().min(0).max(100000),
  downtimeHours: z.coerce.number().int().min(0).max(8760),
  allServiceInterrupted: z.coerce.boolean(),
  alternativeWaterAvailable: z.coerce.boolean(),
});

export const waterPointSchema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9-]+$/),
  name: z.string().trim().min(3).max(120),
  type: z.enum(["BOREHOLE", "HANDPUMP", "MOTORISED_SYSTEM", "SPRING", "OTHER"]),
  county: z.string().trim().min(2).max(80),
  subCounty: z.string().trim().max(80).optional().or(z.literal("")),
  community: z.string().trim().max(100).optional().or(z.literal("")),
  peopleServed: z.coerce.number().int().min(0).max(1000000),
  servesSchool: z.coerce.boolean(),
  servesHealthFacility: z.coerce.boolean(),
  alternativeWaterAvailable: z.coerce.boolean(),
});
