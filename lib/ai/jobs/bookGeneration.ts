import { z } from "zod";

export const bookGenerationJobSchema = z.object({
  bookId: z.string(),
  generationVersion: z.number().int().positive(),
  trigger: z.enum(["start", "continue"]),
});

export type BookGenerationJob = z.infer<typeof bookGenerationJobSchema>;
