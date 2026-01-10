"use client";

import { PlanOutput } from "@/lib/ai/schemas/plan";
import { ChapterContent, GenerationProgress } from "@/lib/book/types";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { devtools } from "zustand/middleware";

export interface GenerationContextState {
  generationProgress: GenerationProgress;
  chapters: ChapterContent[];
  viewingChapterIndex: number;
  streamingContent: string;
  currentChapterIndex: number | null;
  currentChapterContent: string;
  awaitingChapterDecision: boolean;
  error: string | null;
  bookGenerationStarted: boolean;
  generationCancelled: boolean;
  bookPlan?: PlanOutput;
}

export type GenerationStoreState = GenerationContextState & {
  actions: {
    initFromServer: () => void;
    setViewingChapterIndex: (index: number) => void;
    setBookPlan: (bookPlan: PlanOutput | undefined) => void;
    updateGenerationProgress: (progress: Partial<GenerationProgress>) => void;
    setupGeneration: (totalChapters: number) => void;
    syncGenerationProgress: (args: {
      chapters: ChapterContent[];
      streamingContent: string;
      currentChapterIndex: number | null;
    }) => void;
    failGeneration: (error: string) => void;
    completeGeneration: () => void;
    finishChapter: (title: string, content: string) => void;
    cancelGeneration: () => void;
    appendDraftChunk: (delta: string) => void;
    updateDraft: (
      draft: Partial<
        Pick<
          GenerationContextState,
          "streamingContent" | "currentChapterContent"
        >
      >,
    ) => void;
    confirmChapter: () => void;
    reset: () => void;
  };
};

export type GenerationInit = {
  chapters?: ChapterContent[];
  bookPlan?: PlanOutput;
};

const initialState: GenerationContextState = {
  generationProgress: { phase: "idle" },
  chapters: [],
  viewingChapterIndex: 0,
  streamingContent: "",
  currentChapterIndex: null,
  currentChapterContent: "",
  awaitingChapterDecision: false,
  error: null,
  bookGenerationStarted: false,
  generationCancelled: false,
};

export type GenerationStore = ReturnType<typeof createGenerationStore>;

export const createGenerationStore = (init?: GenerationInit) => {
  return createStore<GenerationStoreState>()(
    devtools((set, get) => {
      let chapterDecisionResolver:
        | ((decision: "confirm" | "cancel") => void)
        | null = null;

      const resolveChapterDecision = (decision: "confirm" | "cancel") => {
        if (chapterDecisionResolver) {
          chapterDecisionResolver(decision);
          chapterDecisionResolver = null;
        }
      };

      const actions = {
        initFromServer: () => {
          const initialChapters = init?.chapters || [];
          const initialStreamingContent =
            initialChapters.length > 0
              ? initialChapters.map((c) => c.content).join("\n\n")
              : "";

          set(
            {
              chapters: initialChapters,
              bookPlan: init?.bookPlan,
              streamingContent: initialStreamingContent,
              currentChapterContent: "",
              currentChapterIndex: initialChapters.length,
              viewingChapterIndex: initialChapters.length,
            },
            false,
            "generation/initFromServer",
          );
        },

        setViewingChapterIndex: (index: number) => {
          set(
            { viewingChapterIndex: index },
            false,
            "generation/setViewingChapterIndex",
          );
        },

        setBookPlan: (bookPlan: PlanOutput | undefined) => {
          set({ bookPlan }, false, "generation/setBookPlan");
        },

        updateGenerationProgress: (progress: Partial<GenerationProgress>) => {
          set(
            (state) => ({
              generationProgress: {
                ...state.generationProgress,
                ...progress,
              },
            }),
            false,
            "generation/updateGenerationProgress",
          );
        },

        setupGeneration: (totalChapters: number) => {
          set(
            {
              error: null,
              generationProgress: {
                phase: "deducting_credits",
                currentChapter: 1,
                totalChapters,
                currentSection: 0,
                totalSections: 0,
                currentOutline: undefined,
              },
              bookGenerationStarted: true,
              generationCancelled: false,
              currentChapterIndex: 0,
              chapters: [],
              streamingContent: "",
              viewingChapterIndex: 0,
              awaitingChapterDecision: false,
            },
            false,
            "generation/setupGeneration",
          );
        },

        syncGenerationProgress: ({
          chapters,
          streamingContent,
          currentChapterIndex,
        }: {
          chapters: ChapterContent[];
          streamingContent: string;
          currentChapterIndex: number | null;
        }) => {
          set(
            {
              chapters,
              streamingContent,
              viewingChapterIndex: chapters.length,
              currentChapterIndex,
              generationProgress: {
                phase: "generating_sections",
                currentChapter: (currentChapterIndex || 0) + 1,
                totalChapters: get().generationProgress.totalChapters || 0,
              },
            },
            false,
            "generation/syncGenerationProgress",
          );
        },

        failGeneration: (error: string) => {
          set(
            {
              error,
              awaitingChapterDecision: false,
              currentChapterIndex: null,
              generationProgress: { phase: "error", error },
              bookGenerationStarted: false,
            },
            false,
            "generation/failGeneration",
          );
        },

        completeGeneration: () => {
          set(
            {
              generationProgress: { phase: "completed" },
              bookGenerationStarted: false,
            },
            false,
            "generation/completeGeneration",
          );
        },

        finishChapter: (title: string, content: string) => {
          const state = get();
          const newChapter = {
            chapterNumber: (state.currentChapterIndex || 0) + 1,
            chapterTitle: title,
            content: content,
            isComplete: true,
          };

          set(
            {
              chapters: [...state.chapters, newChapter],
              currentChapterContent: "",
              currentChapterIndex: (state.currentChapterIndex || 0) + 1,
              viewingChapterIndex: state.chapters.length + 1,
            },
            false,
            "generation/finishChapter",
          );
        },

        cancelGeneration: () => {
          set(
            {
              awaitingChapterDecision: false,
              currentChapterIndex: null,
              currentChapterContent: "",
              bookGenerationStarted: false,
              generationCancelled: true,
            },
            false,
            "generation/cancelGeneration",
          );
          resolveChapterDecision("cancel");
        },

        appendDraftChunk: (delta: string) => {
          if (!delta) return;
          set(
            (state) => ({
              streamingContent: state.streamingContent + delta,
              currentChapterContent: state.currentChapterContent + delta,
            }),
            false,
            "generation/appendDraftChunk",
          );
        },

        updateDraft: (
          draft: Partial<
            Pick<
              GenerationContextState,
              "streamingContent" | "currentChapterContent"
            >
          >,
        ) => {
          set(draft, false, "generation/updateDraft");
        },

        confirmChapter: () => {
          set(
            { awaitingChapterDecision: false },
            false,
            "generation/confirmChapter",
          );
          resolveChapterDecision("confirm");
        },

        reset: () => {
          resolveChapterDecision("cancel");
          set(initialState, false, "generation/reset");
        },
      };

      const base = {
        ...initialState,
        actions,
      };

      if (init) {
        const initialChapters = init.chapters || [];
        const initialStreamingContent =
          initialChapters.length > 0
            ? initialChapters.map((c) => c.content).join("\n\n")
            : "";

        return {
          ...base,
          chapters: initialChapters,
          bookPlan: init.bookPlan,
          streamingContent: initialStreamingContent,
          currentChapterContent: "",
          currentChapterIndex: initialChapters.length,
          viewingChapterIndex: initialChapters.length,
        };
      }

      return base;
    }),
  );
};

const GenerationStoreContext = createContext<GenerationStore | null>(null);

export function GenerationStoreProvider(props: {
  init: GenerationInit;
  children: ReactNode;
}) {
  const [store] = useState(() => createGenerationStore(props.init));

  return (
    <GenerationStoreContext.Provider value={store}>
      {props.children}
    </GenerationStoreContext.Provider>
  );
}

export function useGenerationStore<T>(
  selector: (state: GenerationStoreState) => T,
): T {
  const store = useContext(GenerationStoreContext);
  if (!store) {
    throw new Error(
      "useGenerationStore must be used within GenerationStoreProvider",
    );
  }
  return useStore(store, selector);
}

export function useGenerationStoreApi(): GenerationStore {
  const store = useContext(GenerationStoreContext);
  if (!store) {
    throw new Error(
      "useGenerationStoreApi must be used within GenerationStoreProvider",
    );
  }
  return store;
}
