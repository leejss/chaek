import { AIProvider } from "@/lib/book/types";
import { z } from "zod";

const languageSchema = z.enum([
  "Korean",
  "English",
  "Japanese",
  "Chinese",
  "Auto",
]);

export const generateBookJobSchema = z.object({
  bookId: z.string().min(1),
  step: z.enum(["init", "chapter", "finalize"]),
  chapterNumber: z.number().int().min(1).optional(),
  provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
  model: z.string().min(1),
  language: languageSchema.default("Korean"),
  userPreference: z.string().default(""),
});

export type GenerateBookJob = z.infer<typeof generateBookJobSchema>;
