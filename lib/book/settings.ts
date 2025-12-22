import { AIProvider, ClaudeModel, GeminiModel } from "./types";

export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";
export type ChapterCount = number | "Auto";

export interface BookSettings {
  language: Language;
  chapterCount: ChapterCount;
  defaultModel: string;
  userPreference: string;
}

export const defaultSettings: BookSettings = {
  language: "Korean",
  chapterCount: "Auto",
  defaultModel: GeminiModel.FLASH,
  userPreference: "",
};
