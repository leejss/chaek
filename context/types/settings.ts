import type { AIProvider, ClaudeModel, GeminiModel } from "@/lib/ai/config";
import type { Language } from "@/lib/ai/schemas/settings";

export interface BookSettings {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
}

export interface BookGenerationSettings extends BookSettings {
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
}
