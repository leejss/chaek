import * as z from "zod";

import { contentBriefResultSchema } from "./brief";

export const createContentProjectRequestSchema = z.strictObject({
  seedInput: z.string().trim().min(3).max(2_000),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const briefGenerationJobInputSchema = z.strictObject({
  promptVersion: z.literal(1),
  payloadVersion: z.literal(1),
  seedInput: z.string().trim().min(3).max(2_000),
});

export const graphPlanningJobInputSchema = z.strictObject({
  promptVersion: z.literal(1),
  payloadVersion: z.literal(1),
  baseGraphVersion: z.number().int().nonnegative(),
  seedInput: z.string().trim().min(3).max(2_000),
  brief: contentBriefResultSchema,
});

export type CreateContentProjectRequest = z.infer<
  typeof createContentProjectRequestSchema
>;
export type BriefGenerationJobInput = z.infer<
  typeof briefGenerationJobInputSchema
>;
export type GraphPlanningJobInput = z.infer<typeof graphPlanningJobInputSchema>;
