import { z } from "zod";

export const PlanSchema = z.object({
  targetAudience: z.string().describe("The primary audience for this book"),
  writingStyle: z
    .string()
    .describe("The tone and voice to be used throughout the book"),
  keyThemes: z
    .array(z.string())
    .describe("Major themes to be consistently addressed"),
  chapterGuidelines: z
    .array(
      z.object({
        chapterIndex: z.number(),
        title: z.string().describe("The title of the chapter"),
        guidelines: z
          .string()
          .describe("Specific instructions or focus for this chapter"),
      }),
    )
    .describe("High-level guidelines for each chapter"),
});

export type PlanOutput = z.infer<typeof PlanSchema>;
