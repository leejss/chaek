"use client";

import {
  type AIProvider,
  type ClaudeModel,
  type GeminiModel,
  getDefaultConfig,
} from "@/lib/ai/config";
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { BookSettings } from "./types/settings";

export type ChapterCount = number | "Auto";

interface SettingsState {
  settings: BookSettings;

  requireConfirm: boolean;
  tocProvider: AIProvider;
  tocModel: GeminiModel | ClaudeModel;
  contentProvider: AIProvider;
  contentModel: GeminiModel | ClaudeModel;
}

interface SettingsStore extends SettingsState {
  actions: {
    update: <K extends keyof SettingsState>(
      key: K,
      value: SettingsState[K],
    ) => void;
  };
}

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        settings: {
          language: "Korean",
          chapterCount: "Auto",
          userPreference: "",
        },
        requireConfirm: true,
        tocProvider: getDefaultConfig().provider,
        tocModel: getDefaultConfig().model,
        contentProvider: getDefaultConfig().provider,
        contentModel: getDefaultConfig().model,

        actions: {
          update: (key, value) =>
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

export const updateSettingsStore = useSettingsStore.getState().actions.update;
