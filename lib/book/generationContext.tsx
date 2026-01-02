"use client";

import { PlanOutput } from "@/lib/ai/specs/plan";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/config";
import { ChapterContent, GenerationProgress } from "@/lib/book/types";
import { BookGenerationSettings } from "@/lib/book/settings";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { devtools } from "zustand/middleware";

export interface GenerationContextState {
  savedBookId: string | null;
  bookTitle: string;
  sourceText: string;
  tableOfContents: string[];
  generationSettings: BookGenerationSettings;
  content: string;
  bookPlan?: PlanOutput;
  chapters: ChapterContent[];
  viewingChapterIndex: number;
  streamingContent: string;
  currentChapterIndex: number | null;
  currentChapterContent: string;
  awaitingChapterDecision: boolean;
  error: string | null;
  generationProgress: GenerationProgress;
  bookGenerationStarted: boolean;
  generationCancelled: boolean;
}

export type GenerationStoreState = GenerationContextState & {
  actions: {
    initFromServer: (payload: GenerationInit) => void;
    setViewingChapterIndex: (index: number) => void;
    setSavedBookId: (bookId: string | null) => void;
    setContent: (content: string) => void;
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
    updateDraft: (
      draft: Partial<
        Pick<
          GenerationContextState,
          "content" | "streamingContent" | "currentChapterContent"
        >
      >,
    ) => void;
    confirmChapter: () => void;
    reset: () => void;
  };
};

export type GenerationInit = {
  bookId: string;
  title: string;
  content: string;
  tableOfContents: string[];
  sourceText?: string;
  generationSettings?: Partial<BookGenerationSettings>;
  bookPlan?: PlanOutput;
};

const createInitialSettings = (
  partial?: Partial<BookGenerationSettings>,
): BookGenerationSettings => {
  return {
    language: partial?.language ?? "Korean",
    chapterCount: partial?.chapterCount ?? "Auto",
    userPreference: partial?.userPreference ?? "",
    provider: partial?.provider ?? DEFAULT_PROVIDER,
    model: partial?.model ?? DEFAULT_MODEL,
  };
};

const initialState: GenerationContextState = {
  savedBookId: null,
  bookTitle: "",
  sourceText: "",
  tableOfContents: [],
  generationSettings: createInitialSettings(),
  content: "",
  bookPlan: undefined,
  chapters: [],
  viewingChapterIndex: 0,
  streamingContent: "",
  currentChapterIndex: null,
  currentChapterContent: "",
  awaitingChapterDecision: false,
  error: null,
  generationProgress: { phase: "idle" },
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
        initFromServer: (payload: GenerationInit) => {
          set(
            {
              savedBookId: payload.bookId,
              bookTitle: payload.title,
              content: payload.content || "",
              streamingContent: payload.content || "",
              tableOfContents: payload.tableOfContents || [],
              sourceText: payload.sourceText || "",
              generationSettings: createInitialSettings(
                payload.generationSettings,
              ),
              bookPlan: payload.bookPlan,
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

        setSavedBookId: (bookId: string | null) => {
          set({ savedBookId: bookId }, false, "generation/setSavedBookId");
        },

        setContent: (content: string) => {
          set({ content }, false, "generation/setContent");
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
              savedBookId: get().savedBookId,
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

        updateDraft: (
          draft: Partial<
            Pick<
              GenerationContextState,
              "content" | "streamingContent" | "currentChapterContent"
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
        return {
          ...base,
          savedBookId: init.bookId,
          bookTitle: init.title,
          content: init.content || "",
          streamingContent: init.content || "",
          tableOfContents: init.tableOfContents || [],
          sourceText: init.sourceText || "",
          generationSettings: createInitialSettings(init.generationSettings),
          bookPlan: init.bookPlan,
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
