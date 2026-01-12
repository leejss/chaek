"use client";

import { PlanOutput } from "@/lib/ai/schemas/plan";
import { ChapterContent, GenerationProgress } from "@/context/types/generation";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { devtools } from "zustand/middleware";

export interface GenerationState {
  generationProgress: GenerationProgress;
  chapters: ChapterContent[];
  currentChapterIndex: number;
  currentChapterContent: string;
  viewingChapterIndex: number;
  awaitingChapterDecision: boolean;
  error: string | null;
  bookPlan?: PlanOutput;
}

export type GenerationStoreState = GenerationState & {
  actions: {
    init: (bookPlan?: PlanOutput, chapters?: ChapterContent[]) => void;
    updateProgress: (progress: Partial<GenerationProgress>) => void;
    startGeneration: (totalChapters: number) => void;
    syncProgress: (
      chapters: ChapterContent[],
      currentChapterIndex: number,
    ) => void;
    fail: (error: string) => void;
    complete: () => void;
    finishChapter: (title: string, content: string) => void;
    appendDraftChunk: (delta: string) => void;
    cancel: () => void;
    confirmChapter: () => Promise<void>;
    setViewingChapterIndex: (index: number) => void;
    reset: () => void;
  };
};

export type GenerationInit = {
  chapters?: ChapterContent[];
  bookPlan?: PlanOutput;
};

const createInitialState = (): GenerationState => ({
  generationProgress: { phase: "idle" },
  chapters: [],
  currentChapterIndex: -1,
  currentChapterContent: "",
  viewingChapterIndex: -1,
  awaitingChapterDecision: false,
  error: null,
  bookPlan: undefined,
});

let chapterConfirmResolver: (() => void) | null = null;

const createGenerationStore = (init?: GenerationInit) => {
  return createStore<GenerationStoreState>()(
    devtools((set, get) => {
      const actions = {
        init: (bookPlan?: PlanOutput, chapters?: ChapterContent[]) => {
          const initialChapters = chapters || [];
          const baseState = createInitialState();

          set(
            {
              ...baseState,
              chapters: initialChapters,
              bookPlan,
              chapters: initialChapters,
              bookPlan,
              currentChapterIndex: initialChapters.length,
              viewingChapterIndex: initialChapters.length,
            },
            false,
            "generation/init",
          );
        },

        updateProgress: (progress: Partial<GenerationProgress>) => {
          set(
            (state) => ({
              generationProgress: { ...state.generationProgress, ...progress },
            }),
            false,
            "generation/updateProgress",
          );
        },

        startGeneration: (totalChapters: number) => {
          set(
            {
              error: null,
              generationProgress: {
                phase: "deducting_credits",
                currentChapter: 1,
                totalChapters,
                currentSection: 0,
                totalSections: 0,
              },
              currentChapterIndex: 0,
              viewingChapterIndex: 0,
              currentChapterContent: "",
            },
            false,
            "generation/startGeneration",
          );
        },

        syncProgress: (
          chapters: ChapterContent[],
          currentChapterIndex: number,
        ) => {
          set(
            {
              chapters,
              chapters,
              currentChapterIndex,
              viewingChapterIndex: currentChapterIndex,
              generationProgress: {
                phase: "generating_sections",
                currentChapter: currentChapterIndex + 1,
                totalChapters: get().generationProgress.totalChapters || 0,
                currentSection: 0,
                totalSections: 0,
              },
            },
            false,
            "generation/syncProgress",
          );
        },

        fail: (error: string) => {
          set(
            {
              error,
              awaitingChapterDecision: false,
              error,
              awaitingChapterDecision: false,
              currentChapterIndex: -1,
              viewingChapterIndex: -1,
              generationProgress: { phase: "error", error },
            },
            false,
            "generation/fail",
          );
        },

        complete: () => {
          set(
            { generationProgress: { phase: "completed" } },
            false,
            "generation/complete",
          );
        },

        finishChapter: (title: string, content: string) => {
          const state = get();
          const newChapter: ChapterContent = {
            chapterNumber: state.currentChapterIndex + 1,
            chapterTitle: title,
            content,
            isComplete: true,
            outline: state.generationProgress.currentOutline,
          };

          set(
            {
              chapters: [...state.chapters, newChapter],
              chapters: [...state.chapters, newChapter],
              currentChapterContent: "",
              currentChapterIndex: state.currentChapterIndex + 1,
              viewingChapterIndex: state.currentChapterIndex + 1,
            },
            false,
            "generation/finishChapter",
          );
        },

        appendDraftChunk: (delta: string) => {
          if (!delta) return;
          set(
            (state) => ({
              currentChapterContent: state.currentChapterContent + delta,
            }),
            false,
            "generation/appendDraftChunk",
          );
        },

        cancel: () => {
          if (chapterConfirmResolver) {
            chapterConfirmResolver();
            chapterConfirmResolver = null;
          }
          set(
            {
              awaitingChapterDecision: false,
              awaitingChapterDecision: false,
              currentChapterIndex: -1,
              viewingChapterIndex: -1,
              currentChapterContent: "",
              generationProgress: { phase: "idle" },
            },
            false,
            "generation/cancel",
          );
        },

        confirmChapter: () => {
          return new Promise<void>((resolve) => {
            chapterConfirmResolver = resolve;
            set(
              { awaitingChapterDecision: false },
              false,
              "generation/confirmChapter",
            );
          });
        },

        setViewingChapterIndex: (index: number) => {
          set(
            { viewingChapterIndex: index },
            false,
            "generation/setViewingChapterIndex",
          );
        },

        reset: () => {
          if (chapterConfirmResolver) {
            chapterConfirmResolver();
            chapterConfirmResolver = null;
          }
          set(createInitialState(), false, "generation/reset");
        },
      };

      const state: GenerationStoreState = {
        ...createInitialState(),
        actions,
      };

      if (init) {
        const initialChapters = init.chapters || [];
        state.chapters = initialChapters;
        state.bookPlan = init.bookPlan;
        state.currentChapterContent = "";
        state.currentChapterIndex = initialChapters.length;
        state.viewingChapterIndex = initialChapters.length;
      }

      return state;
    }),
  );
};

export const generationStore = createGenerationStore();
export const generationActions = generationStore.getState().actions;

export function useGenerationStore<T>(
  selector: (state: GenerationStoreState) => T,
): T {
  return useStore(generationStore, selector);
}
