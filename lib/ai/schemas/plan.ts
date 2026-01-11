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
        continuity: z
          .object({
            fromPrevious: z
              .string()
              .describe(
                "How this chapter builds on the previous one (if any)",
              ),
            toNext: z
              .string()
              .describe("How this chapter sets up the next one (if any)"),
            recurringElements: z
              .array(z.string())
              .describe(
                "Terms/metaphors/examples that should remain consistent across chapters",
              ),
            avoidOverlapWith: z
              .array(z.number())
              .describe(
                "Chapter indices that this chapter must not duplicate; explain distinctions in guidelines",
              ),
          })
          .describe("Instructions to strengthen cross-chapter cohesion"),
      }),
    )
    .describe("High-level guidelines for each chapter"),
});

export type PlanOutput = z.infer<typeof PlanSchema>;
