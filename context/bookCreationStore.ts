"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  type AIProvider,
  type ClaudeModel,
  type GeminiModel,
  getDefaultConfig,
} from "@/lib/ai/config";
import type { Language } from "@/lib/ai/schemas/settings";

export type TocGenerationStep = "settings" | "source_input" | "toc_review";

type TocGenerationState =
  | { status: "idle" }
  | { status: "loading"; variant: "initial" | "regenerate" }
  | { status: "error"; message: string };

interface BookCreationState {
  language: Language;
  chapterCount: number | "Auto";
  userPreference: string;
  tocProvider: AIProvider;
  tocModel: GeminiModel | ClaudeModel;
  contentProvider: AIProvider;
  contentModel: GeminiModel | ClaudeModel;

  sourceText: string;
  bookTitle: string;
  tableOfContents: string[];
  tocGeneration: TocGenerationState;
}

interface BookCreationStore extends BookCreationState {
  actions: {
    set: <K extends keyof BookCreationState>(key: K, value: BookCreationState[K]) => void;
    setTocResult: (title: string, chapters: string[]) => void;
    startTocGeneration: (variant: "initial" | "regenerate") => void;
    failTocGeneration: (message: string) => void;
  };
}

const PERSISTED_KEYS: (keyof BookCreationState)[] = [
  "language",
  "chapterCount",
  "userPreference",
  "tocProvider",
  "tocModel",
  "contentProvider",
  "contentModel",
];

export const useBookCreationStore = create<BookCreationStore>()(
  devtools(
    persist(
      (set) => ({
        language: "Korean",
        chapterCount: "Auto",
        userPreference: "",
        tocProvider: getDefaultConfig().provider,
        tocModel: getDefaultConfig().model,
        contentProvider: getDefaultConfig().provider,
        contentModel: getDefaultConfig().model,

        sourceText: "",
        bookTitle: "",
        tableOfContents: [],
        tocGeneration: { status: "idle" },

        actions: {
          set: (key, value) =>
            set({ [key]: value } as Partial<BookCreationState>, false, `book/${key}`),

          setTocResult: (title, chapters) =>
            set(
              { bookTitle: title, tableOfContents: chapters, tocGeneration: { status: "idle" } },
              false,
              "book/setTocResult",
            ),

          startTocGeneration: (variant) =>
            set(
              { tocGeneration: { status: "loading", variant } },
              false,
              `book/tocGeneration/start/${variant}`,
            ),

          failTocGeneration: (message) =>
            set({ tocGeneration: { status: "error", message } }, false, "book/tocGeneration/fail"),
        },
      }),
      {
        name: "book-creation-storage",
        partialize: (state) => {
          const persisted: Record<string, unknown> = {};
          for (const key of PERSISTED_KEYS) {
            persisted[key] = state[key];
          }
          return persisted;
        },
      },
    ),
  ),
);

const { actions } = useBookCreationStore.getState();
export const setBookField = actions.set;
export const setTocResult = actions.setTocResult;
export const startTocGeneration = actions.startTocGeneration;
export const failTocGeneration = actions.failTocGeneration;

export function canAccessStep(step: TocGenerationStep, tableOfContents: string[]): boolean {
  switch (step) {
    case "settings":
    case "source_input":
      return true;
    case "toc_review":
      return tableOfContents.length > 0;
    default:
      return false;
  }
}

export function isStepCompleted(step: TocGenerationStep, tableOfContents: string[]): boolean {
  switch (step) {
    case "settings":
      return true;
    case "source_input":
      return tableOfContents.length > 0;
    case "toc_review":
      return false;
    default:
      return false;
  }
}
