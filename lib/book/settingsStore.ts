import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MODEL } from "@/lib/ai/config";

export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";
export type ChapterCount = number | "Auto";

interface SettingsState {
  language: Language;
  chapterCount: ChapterCount; // 3-10 or "Auto"
  defaultModel: string;
  userPreference: string;
}

interface SettingsActions {
  setLanguage: (lang: Language) => void;
  setChapterCount: (count: ChapterCount) => void;
  setDefaultModel: (modelId: string) => void;
  setUserPreference: (pref: string) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      language: "Korean", // Default as per context (Korean app)
      chapterCount: "Auto",
      defaultModel: DEFAULT_MODEL,
      userPreference: "",

      setLanguage: (language) => set({ language }),
      setChapterCount: (chapterCount) => set({ chapterCount }),
      setDefaultModel: (defaultModel) => set({ defaultModel }),
      setUserPreference: (userPreference) => set({ userPreference }),
    }),
    {
      name: "book-settings-storage",
    },
  ),
);
