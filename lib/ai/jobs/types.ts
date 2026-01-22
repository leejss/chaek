import { z } from "zod";
import { LanguageSchema } from "../schemas/settings";

export const generateBookJobSchema = z.object({
  bookId: z.string().min(1),
  step: z.enum(["init", "chapter", "finalize"]),
  chapterNumber: z.number().int().min(1).optional(),
  provider: z.enum(["google", "anthropic"]),
  model: z.string().min(1),
  language: LanguageSchema.default("Korean"),
  userPreference: z.string().default(""),
});

export type GenerateBookJob = z.infer<typeof generateBookJobSchema>;
