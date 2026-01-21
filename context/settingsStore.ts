"use client";

import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  AIProvider,
  ClaudeModel,
  GeminiModel,
} from "@/lib/ai/config";
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";
export type ChapterCount = number | "Auto";

interface SettingsState {
  language: Language;
  chapterCount: ChapterCount;
  userPreference: string;
  requireConfirm: boolean;
  tocProvider: AIProvider;
  tocModel: GeminiModel | ClaudeModel;
  contentProvider: AIProvider;
  contentModel: GeminiModel | ClaudeModel;
}

interface SettingsStore extends SettingsState {
  actions: {
    set: <K extends keyof SettingsState>(
      key: K,
      value: SettingsState[K],
    ) => void;
  };
}

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        language: "Korean",
        chapterCount: "Auto",
        userPreference: "",
        requireConfirm: true,
        tocProvider: DEFAULT_PROVIDER,
        tocModel: DEFAULT_MODEL,
        contentProvider: DEFAULT_PROVIDER,
        contentModel: DEFAULT_MODEL,

        actions: {
          set: (key, value) =>
            set(
              { [key]: value } as Partial<SettingsState>,
              false,
              `settings/set/${key}`,
            ),
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
  ),
);

export const settingsStoreActions = useSettingsStore.getState().actions;
