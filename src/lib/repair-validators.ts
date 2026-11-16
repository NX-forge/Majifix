import { z } from "zod";

const money = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? Number.NaN : value,
  z.coerce.number().finite().min(0).max(1_000_000_000),
);

export const repairEstimateSchema = z.object({
  faultId: z.string().trim().min(1).max(100),
  estimatedCost: money,
  notes: z.string().trim().min(4).max(1000),
}).strict();

export const repairCostDecisionSchema = z.object({
  faultId: z.string().trim().min(1).max(100),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(10).max(500),
}).strict();

export const repairAssignmentDecisionSchema = z.object({
  faultId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(10).max(500).optional().or(z.literal("")),
}).strict();

export const repairDelaySchema = z.object({
  faultId: z.string().trim().min(1).max(100),
  reason: z.enum(["SPARE_PARTS_UNAVAILABLE", "TRANSPORT", "WEATHER", "SITE_ACCESS", "FUNDING", "TECHNICAL_COMPLEXITY", "OTHER"]),
  description: z.string().trim().min(10).max(1000),
  partName: z.string().trim().max(120).optional().or(z.literal("")),
  quantity: z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : value, z.coerce.number().int().min(1).max(100000).optional()),
  supplier: z.string().trim().max(120).optional().or(z.literal("")),
  expectedResolutionAt: z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : value, z.coerce.date().optional()),
}).strict().superRefine((value, context) => {
  if (value.reason === "SPARE_PARTS_UNAVAILABLE" && !value.partName) {
    context.addIssue({ code: "custom", message: "Enter the spare part that is unavailable.", path: ["partName"] });
  }
});

export const resolveRepairDelaySchema = z.object({
  delayId: z.string().trim().min(1).max(100),
  resolutionNotes: z.string().trim().min(4).max(500),
}).strict();
