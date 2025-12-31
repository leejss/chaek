import { AIProvider } from "@/lib/book/types";
import { z } from "zod";

export const generateBookJobSchema = z.object({
  bookId: z.string().min(1),
  step: z.enum(["init", "chapter", "finalize"]),
  chapterNumber: z.number().int().min(1).optional(),
  provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
  model: z.string().min(1),
  language: z.string().min(1).default("Korean"),
  userPreference: z.string().optional(),
});

export type GenerateBookJob = z.infer<typeof generateBookJobSchema>;
