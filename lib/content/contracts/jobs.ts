import * as z from "zod";

import { contentBriefResultSchema } from "./brief";
import {
  chapterContextConceptSchema,
  chapterContextNeighborSchema,
  chapterContextPartSchema,
  chapterContractSchema,
} from "./chapter-content";

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

export const chapterDraftingJobInputSchema = z.strictObject({
  promptVersion: z.literal(1),
  payloadVersion: z.literal(1),
  baseGraphVersion: z.number().int().nonnegative(),
  seedInput: z.string().trim().min(3).max(2_000),
  brief: contentBriefResultSchema,
  part: chapterContextPartSchema,
  chapter: z.strictObject({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1).max(240),
    contract: chapterContractSchema,
  }),
  neighboringChapters: z.strictObject({
    previous: chapterContextNeighborSchema.nullable(),
    next: chapterContextNeighborSchema.nullable(),
  }),
  concepts: z.array(chapterContextConceptSchema).max(100),
});

export type CreateContentProjectRequest = z.infer<
  typeof createContentProjectRequestSchema
>;
export type BriefGenerationJobInput = z.infer<
  typeof briefGenerationJobInputSchema
>;
export type GraphPlanningJobInput = z.infer<typeof graphPlanningJobInputSchema>;
export type ChapterDraftingJobInput = z.infer<
  typeof chapterDraftingJobInputSchema
>;
