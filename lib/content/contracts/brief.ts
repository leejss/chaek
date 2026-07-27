import * as z from "zod";

import { toGeminiJsonSchema } from "./json-schema";

const conciseText = z.string().trim().min(1).max(2_000);
const shortText = z.string().trim().min(1).max(240);

export const contentBriefResultSchema = z.strictObject({
  title: shortText,
  language: z.string().trim().min(2).max(32),
  audience: conciseText,
  prerequisites: z.array(shortText).max(20),
  promise: conciseText,
  scope: z.array(shortText).min(1).max(30),
  exclusions: z.array(shortText).max(30),
  completionArtifact: conciseText,
  assumptions: z.array(shortText).max(20),
});

export type ContentBriefResult = z.infer<typeof contentBriefResultSchema>;

export const contentBriefJsonSchema = toGeminiJsonSchema(
  contentBriefResultSchema,
);
