import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";
export type ChapterCount = number | "Auto";

interface SettingsState {
  language: Language;
  chapterCount: ChapterCount; // 3-10 or "Auto"
  userPreference: string;
  requireConfirm: boolean;
}

interface SettingsStore extends SettingsState {
  actions: {
    setLanguage: (lang: Language) => void;
    setChapterCount: (count: ChapterCount) => void;
    setUserPreference: (pref: string) => void;
    setRequireConfirm: (value: boolean) => void;
  };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: "Korean", // Default as per context (Korean app)
      chapterCount: "Auto",
      userPreference: "",
      requireConfirm: true,

      actions: {
        setLanguage: (language) => set({ language }),
        setChapterCount: (chapterCount) => set({ chapterCount }),
        setUserPreference: (userPreference) => set({ userPreference }),
        setRequireConfirm: (requireConfirm) => set({ requireConfirm }),
      },
    }),
    {
      name: "book-settings-storage",
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { actions, ...rest } = state;
        return rest;
      },
    },
  ),
);
