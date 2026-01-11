import { z } from "zod";

export const LanguageSchema = z.enum([
  "Korean",
  "English",
  "Japanese",
  "Chinese",
  "Auto",
]);

export const AIProviderSchema = z.enum(["google", "anthropic"]);

export const GeminiModelSchema = z.enum([
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
]);

export const ClaudeModelSchema = z.enum([
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
]);

export const ModelSchema = z.union([GeminiModelSchema, ClaudeModelSchema]);

export const BookGenerationSettingsSchema = z.object({
  language: LanguageSchema,
  chapterCount: z.union([z.number().int().positive(), z.literal("Auto")]),
  userPreference: z.string(),
  provider: AIProviderSchema,
  model: ModelSchema,
});

export type BookGenerationSettingsValidated = z.infer<
  typeof BookGenerationSettingsSchema
>;
