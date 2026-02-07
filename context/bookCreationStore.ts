"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  type BookCreationDraftSnapshot,
  type BookCreationState,
  getBookCreationDraftResetState,
  getDefaultBookCreationState,
  selectBookCreationPersistedState,
} from "@/context/types/bookCreation";

export type TocGenerationStep = "settings" | "source_input" | "toc_review";

export interface BookCreationStore extends BookCreationState {
  actions: {
    set: <K extends keyof BookCreationState>(key: K, value: BookCreationState[K]) => void;
    setMany: (value: Partial<BookCreationState>) => void;
    setFromDraftSnapshot: (value: BookCreationDraftSnapshot) => void;
    resetDraft: () => void;
    setTocResult: (title: string, chapters: string[]) => void;
    startTocGeneration: (variant: "initial" | "regenerate") => void;
    failTocGeneration: (message: string) => void;
  };
}

export const useBookCreationStore = create<BookCreationStore>()(
  devtools(
    persist(
      (set) => ({
        ...getDefaultBookCreationState(),

        actions: {
          set: (key, value) =>
            set({ [key]: value } as Partial<BookCreationState>, false, `book/${key}`),
          setMany: (value) => set(value, false, "book/setMany"),
          setFromDraftSnapshot: (value) => set(value, false, "book/setFromDraftSnapshot"),
          resetDraft: () => set(getBookCreationDraftResetState(), false, "book/resetDraft"),

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
        partialize: (state) => selectBookCreationPersistedState(state),
      },
    ),
  ),
);

const { actions } = useBookCreationStore.getState();
export const setBookField = actions.set;
export const setBookFields = actions.setMany;
export const setBookStateFromDraft = actions.setFromDraftSnapshot;
export const resetBookDraft = actions.resetDraft;
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
