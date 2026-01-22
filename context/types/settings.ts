import type { Language } from "@/lib/ai/schemas/settings";

export interface BookSettings {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
}
