export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";

export interface BookSettings {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
}

export interface BookGenerationSettings extends BookSettings {
  provider: import("@/lib/book/types").AIProvider;
  model: import("@/lib/book/types").GeminiModel | import("@/lib/book/types").ClaudeModel;
}

export const defaultSettings: BookSettings = {
  language: "Korean",
  chapterCount: "Auto",
  userPreference: "",
};
