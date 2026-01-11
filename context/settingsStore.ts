"use client";

import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  AIProvider,
  ClaudeModel,
  GeminiModel,
} from "@/lib/ai/config";
import { AIConfiguration } from "@/context/types/settings";
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

export type Language = "Korean" | "English" | "Japanese" | "Chinese" | "Auto";
export type ChapterCount = number | "Auto";

interface SettingsState {
  language: Language;
  chapterCount: ChapterCount;
  userPreference: string;
  requireConfirm: boolean;
  aiConfiguration: AIConfiguration;
}

interface SettingsStore extends SettingsState {
  actions: {
    setLanguage: (lang: Language) => void;
    setChapterCount: (count: ChapterCount) => void;
    setUserPreference: (pref: string) => void;
    setRequireConfirm: (value: boolean) => void;
    setTocAiConfiguration: (
      provider: AIProvider,
      model: GeminiModel | ClaudeModel,
    ) => void;
    setContentAiConfiguration: (
      provider: AIProvider,
      model: GeminiModel | ClaudeModel,
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
        aiConfiguration: {
          toc: {
            provider: DEFAULT_PROVIDER,
            model: DEFAULT_MODEL,
          },
          content: {
            provider: DEFAULT_PROVIDER,
            model: DEFAULT_MODEL,
          },
        },

        actions: {
          setLanguage: (language) =>
            set({ language }, false, "settings/setLanguage"),
          setChapterCount: (chapterCount) =>
            set({ chapterCount }, false, "settings/setChapterCount"),
          setUserPreference: (userPreference) =>
            set({ userPreference }, false, "settings/setUserPreference"),
          setRequireConfirm: (requireConfirm) =>
            set({ requireConfirm }, false, "settings/setRequireConfirm"),
          setTocAiConfiguration: (provider, model) =>
            set(
              (state) => ({
                aiConfiguration: {
                  ...state.aiConfiguration,
                  toc: { provider, model },
                },
              }),
              false,
              "settings/setTocAiConfiguration",
            ),
          setContentAiConfiguration: (provider, model) =>
            set(
              (state) => ({
                aiConfiguration: {
                  ...state.aiConfiguration,
                  content: { provider, model },
                },
              }),
              false,
              "settings/setContentAiConfiguration",
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
