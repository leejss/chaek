import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/ai/config";

export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";

export interface BookSettings {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
}

export interface BookGenerationSettings extends BookSettings {
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
}
