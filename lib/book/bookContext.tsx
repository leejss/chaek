"use client";

import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/config";
import { fetchTableOfContent } from "@/lib/ai/fetch";
import {
  AIProvider,
  Book,
  BookContextState,
  ChapterContent,
  ClaudeModel,
  FlowStatus,
  GeminiModel,
} from "@/lib/book/types";
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";
import { useSettingsStore } from "./settingsStore";

const FLOW_STEPS = [
  "settings",
  "source_input",
  "toc_review",
  "generating",
  "completed",
] as const;

const initialState: BookContextState = {
  sourceText: "",
  bookTitle: "",
  tableOfContents: [],
  bookPlan: undefined,
  content: "",
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
  flowStatus: "settings",
  chapters: [],
  viewingChapterIndex: 0,
  streamingContent: "",
  currentChapterIndex: null,
  currentChapterContent: "",
  awaitingChapterDecision: false,
  isSavingBook: false,
  savedBookId: null,
  isProcessing: false,
  error: null,
  generationProgress: { phase: "idle" },
  completedSteps: new Set(["settings"]),
  bookGenerationStarted: false,
  generationCancelled: false,
};

export const useBookStore = create(
  devtools(
    combine(initialState, (set, get) => {
      let chapterDecisionResolver:
        | ((decision: "confirm" | "cancel") => void)
        | null = null;

      const resolveChapterDecision = (decision: "confirm" | "cancel") => {
        if (chapterDecisionResolver) {
          chapterDecisionResolver(decision);
          chapterDecisionResolver = null;
        }
      };

      const canAccessStep = (
        step: FlowStatus,
        state: BookContextState,
      ): boolean => {
        if (!FLOW_STEPS.includes(step as (typeof FLOW_STEPS)[number])) {
          return false;
        }

        const currentIndex = FLOW_STEPS.indexOf(
          state.flowStatus as (typeof FLOW_STEPS)[number],
        );
        const targetIndex = FLOW_STEPS.indexOf(
          step as (typeof FLOW_STEPS)[number],
        );

        if (state.bookGenerationStarted) {
          return step === "toc_review" || step === "settings";
        }

        if (state.completedSteps.has(step)) {
          return true;
        }

        if (targetIndex === currentIndex + 1) {
          switch (step) {
            case "source_input":
              return true;
            case "toc_review":
              return state.tableOfContents.length > 0;
            case "generating":
              return state.tableOfContents.length > 0;
            case "completed":
              return state.content.length > 0;
            default:
              return true;
          }
        }

        return false;
      };

      const actions = {
        startNewBook: () => {
          resolveChapterDecision("cancel");
          set(
            {
              sourceText: "",
              bookTitle: "",
              tableOfContents: [],
              bookPlan: undefined,
              content: "",
              flowStatus: "settings",
              chapters: [],
              viewingChapterIndex: 0,
              streamingContent: "",
              currentChapterIndex: null,
              currentChapterContent: "",
              awaitingChapterDecision: false,
              error: null,
              completedSteps: new Set(["settings"]),
              bookGenerationStarted: false,
              generationCancelled: false,
            },
            false,
            "book/startNewBook",
          );
        },

        updateDraft: (
          draft: Partial<
            Pick<
              BookContextState,
              | "sourceText"
              | "bookTitle"
              | "tableOfContents"
              | "content"
              | "currentChapterContent"
            >
          >,
        ) => {
          set(draft, false, "book/updateDraft");
        },

        updateGenerationProgress: (
          progress: Partial<BookContextState["generationProgress"]>,
        ) => {
          set(
            (state) => ({
              generationProgress: {
                ...state.generationProgress,
                ...progress,
              },
            }),
            false,
            "book/updateGenerationProgress",
          );
        },

        setActiveBook: (book: Book) => {
          set(
            {
              sourceText: book.sourceText || "",
              tableOfContents: book.tableOfContents || [],
              bookPlan: undefined,
              content: book.content || "",
              streamingContent: book.content || "",
              currentChapterIndex: null,
              currentChapterContent: "",
              awaitingChapterDecision: false,
            },
            false,
            "book/setActiveBook",
          );
        },

        initializeFromBook: (book: Book) => {
          set(
            {
              sourceText: book.sourceText || "",
              bookTitle: book.title,
              tableOfContents: book.tableOfContents || [],
              content: book.content || "",
              chapters: [],
              viewingChapterIndex: 0,
              streamingContent: "",
              currentChapterIndex: null,
              currentChapterContent: "",
              awaitingChapterDecision: false,
              flowStatus: "generating",
              generationProgress: { phase: "idle" },
              bookGenerationStarted: false,
              generationCancelled: false,
              error: null,
            },
            false,
            "book/initializeFromBook",
          );
        },

        generateTOC: async (sourceText: string) => {
          if (!sourceText.trim()) return;

          set(
            {
              isProcessing: true,
              error: null,
              flowStatus: "generating_toc",
              sourceText,
              bookPlan: undefined,
              completedSteps: new Set([
                ...get().completedSteps,
                "source_input",
              ]),
            },
            false,
            "book/generateTOC_start",
          );

          try {
            const { aiConfiguration } = get();
            const settings = useSettingsStore.getState();
            const { data } = await fetchTableOfContent(
              sourceText,
              aiConfiguration.toc.provider,
              aiConfiguration.toc.model,
              settings,
            );
            const { title, chapters } = data;
            set(
              {
                flowStatus: "toc_review",
                bookTitle: title,
                tableOfContents: chapters,
                completedSteps: new Set([
                  ...get().completedSteps,
                  "toc_review",
                ]),
              },
              false,
              "book/generateTOC_success",
            );
          } catch (err) {
            console.error("TOC generation failed:", err);
            set(
              {
                error: "TOC 생성에 실패했습니다. 다시 시도해 주세요.",
                flowStatus: "source_input",
              },
              false,
              "book/generateTOC_error",
            );
          } finally {
            set({ isProcessing: false }, false, "book/generateTOC_finally");
          }
        },

        regenerateTOC: async () => {
          const { sourceText } = get();
          await actions.generateTOC(sourceText || "");
        },

        confirmChapter: () => {
          set({ awaitingChapterDecision: false }, false, "book/confirmChapter");
          resolveChapterDecision("confirm");
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
            "book/cancelGeneration",
          );
          resolveChapterDecision("cancel");
        },

        setFlowStatus: (status: FlowStatus) => {
          set({ flowStatus: status }, false, "book/setFlowStatus");
        },

        goToStep: (step: FlowStatus) => {
          const state = get();

          if (state.bookGenerationStarted) {
            if (!confirm("진행 중인 생성을 중단하시겠습니까?")) return;
            actions.cancelGeneration();
          }

          if (!canAccessStep(step, state)) return;

          set({ flowStatus: step }, false, "book/goToStep");
        },

        setTocAiConfiguraiton: (
          provider: AIProvider,
          model: GeminiModel | ClaudeModel,
        ) => {
          set(
            (state) => ({
              aiConfiguration: {
                ...state.aiConfiguration,
                toc: {
                  provider,
                  model,
                },
              },
            }),
            false,
            "book/setTocAiConfiguraiton",
          );
        },

        setSelectedModel: (
          provider: AIProvider,
          model: GeminiModel | ClaudeModel,
        ) => {
          set(
            (state) => ({
              aiConfiguration: {
                ...state.aiConfiguration,
                content: {
                  provider,
                  model,
                },
              },
            }),
            false,
            "book/setSelectedModel",
          );
        },

        goToChapter: (index: number) => {
          const { chapters } = get();
          if (index >= 0 && index < chapters.length) {
            set({ viewingChapterIndex: index }, false, "book/goToChapter");
          }
        },

        goToPrevChapter: () => {
          const { viewingChapterIndex } = get();
          if (viewingChapterIndex > 0) {
            set(
              { viewingChapterIndex: viewingChapterIndex - 1 },
              false,
              "book/goToPrevChapter",
            );
          }
        },

        goToNextChapter: () => {
          const { viewingChapterIndex, chapters, currentChapterIndex } = get();
          const maxIndex =
            currentChapterIndex !== null
              ? chapters.length
              : chapters.length - 1;

          if (viewingChapterIndex < maxIndex) {
            set(
              { viewingChapterIndex: viewingChapterIndex + 1 },
              false,
              "book/goToNextChapter",
            );
          }
        },

        setViewingChapterIndex: (index: number) => {
          set(
            { viewingChapterIndex: index },
            false,
            "book/setViewingChapterIndex",
          );
        },

        setupGeneration: (bookId: string) => {
          set(
            {
              savedBookId: bookId,
              error: null,
              generationProgress: {
                phase: "deducting_credits",
                currentChapter: 1,
                totalChapters: get().tableOfContents.length,
                currentSection: 0,
                totalSections: 0,
                currentOutline: undefined,
              },
              bookGenerationStarted: true,
              generationCancelled: false,
              flowStatus: "generating",
              currentChapterIndex: 0,
              chapters: [],
              streamingContent: "",
              viewingChapterIndex: 0,
              awaitingChapterDecision: false,
            },
            false,
            "book/setupGeneration",
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
                totalChapters: get().tableOfContents.length,
              },
            },
            false,
            "book/syncGenerationProgress",
          );
        },

        failGeneration: (error: string) => {
          set(
            {
              error,
              awaitingChapterDecision: false,
              currentChapterIndex: null,
              flowStatus: "toc_review",
              generationProgress: { phase: "error", error },
              bookGenerationStarted: false,
            },
            false,
            "book/failGeneration",
          );
        },

        completeGeneration: (content: string) => {
          const { completedSteps } = get();
          set(
            {
              content,
              flowStatus: "completed",
              currentChapterIndex: null,
              currentChapterContent: "",
              awaitingChapterDecision: false,
              generationProgress: { phase: "completed" },
              bookGenerationStarted: false,
              completedSteps: new Set([...completedSteps, "completed"]),
            },
            false,
            "book/completeGeneration",
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
              viewingChapterIndex: state.chapters.length + 1, // Auto-advance view to next
            },
            false,
            "book/finishChapter",
          );
        },
      };

      return { actions };
    }),
  ),
);

export const bookStoreActions = useBookStore.getState().actions;
