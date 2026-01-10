export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";

export interface BookSettings {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
}

export interface BookGenerationSettings extends BookSettings {
  provider: import("@/lib/ai/config").AIProvider;
  model:
    | import("@/lib/ai/config").GeminiModel
    | import("@/lib/ai/config").ClaudeModel;
}

export const defaultSettings: BookSettings = {
  language: "Korean",
  chapterCount: "Auto",
  userPreference: "",
};
