import { z } from "zod";
import { getAIProvider, getClaudeModel, getGeminiModel } from "../config";

export const LanguageSchema = z.enum(["Korean", "English"]);

export type Language = z.infer<typeof LanguageSchema>;

export const AIProviderSchema = z.enum([
  getAIProvider("GOOGLE"),
  getAIProvider("ANTHROPIC"),
]);

export const GeminiModelSchema = z.enum([
  getGeminiModel("FLASH-3"),
  getGeminiModel("PRO-3"),
]);

export const ClaudeModelSchema = z.enum([
  getClaudeModel("HAIKU-4.5"),
  getClaudeModel("SONNET-4.5"),
]);

export const ModelSchema = z.union([GeminiModelSchema, ClaudeModelSchema]);

export const BookGenerationSettingsSchema = z.object({
  language: LanguageSchema,
  chapterCount: z.union([z.number().int().positive(), z.literal("Auto")]),
  userPreference: z.string(),
  provider: AIProviderSchema,
  model: ModelSchema,
});

export type BookGenerationSettings = z.infer<
  typeof BookGenerationSettingsSchema
>;
