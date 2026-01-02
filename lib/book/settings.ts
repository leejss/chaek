export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";

export interface BookSettings {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
}

export const defaultSettings: BookSettings = {
  language: "Korean",
  chapterCount: "Auto",
  userPreference: "",
};
