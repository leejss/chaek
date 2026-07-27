import * as z from "zod";

import { toGeminiJsonSchema } from "./json-schema";

const ref = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);
const title = z.string().trim().min(1).max(240);
const description = z.string().trim().min(1).max(2_000);
const position = z.number().int().nonnegative().max(10_000);

export const graphPlanPartSchema = z.strictObject({
  ref,
  title,
  purpose: description,
  position,
});

export const graphPlanChapterSchema = z.strictObject({
  ref,
  partRef: ref,
  title,
  position,
  purpose: description,
  readerStateBefore: description,
  readerStateAfter: description,
  mustCover: z.array(title).min(1).max(20),
  mustNotCover: z.array(title).max(20),
});

export const graphPlanConceptSchema = z.strictObject({
  ref,
  name: title,
  canonicalDefinition: description,
});

export const graphPlanExampleSchema = z.strictObject({
  ref,
  name: title,
  completionState: description,
});

export const graphPlanEdgeTypeSchema = z.enum([
  "requires",
  "introduces",
  "uses",
  "continues",
]);

export const graphPlanEdgeSchema = z.strictObject({
  fromRef: ref,
  type: graphPlanEdgeTypeSchema,
  toRef: ref,
});

export const graphPlanResultSchema = z.strictObject({
  baseGraphVersion: z.number().int().nonnegative(),
  parts: z.array(graphPlanPartSchema).min(1).max(30),
  chapters: z.array(graphPlanChapterSchema).min(1).max(200),
  concepts: z.array(graphPlanConceptSchema).max(500),
  examples: z.array(graphPlanExampleSchema).max(200),
  edges: z.array(graphPlanEdgeSchema).max(2_000),
  unresolvedQuestions: z.array(title).max(30),
});

export type GraphPlanPart = z.infer<typeof graphPlanPartSchema>;
export type GraphPlanChapter = z.infer<typeof graphPlanChapterSchema>;
export type GraphPlanConcept = z.infer<typeof graphPlanConceptSchema>;
export type GraphPlanExample = z.infer<typeof graphPlanExampleSchema>;
export type GraphPlanEdge = z.infer<typeof graphPlanEdgeSchema>;
export type GraphPlanEdgeType = z.infer<typeof graphPlanEdgeTypeSchema>;
export type GraphPlanResult = z.infer<typeof graphPlanResultSchema>;

export const graphPlanJsonSchema = toGeminiJsonSchema(graphPlanResultSchema, {
  omitBounds: true,
});
