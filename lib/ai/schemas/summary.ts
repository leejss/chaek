import { z } from "zod";

export const ChapterSummarySchema = z.object({
  chapterId: z.string(),
  summary: z
    .string()
    .min(50)
    .max(600)
    .describe("Concise summary of the chapter content"),
  keyTerms: z
    .array(z.string())
    .max(12)
    .optional()
    .describe("Key definitions or terms introduced"),
});

export type ChapterSummaryOutput = z.infer<typeof ChapterSummarySchema>;
