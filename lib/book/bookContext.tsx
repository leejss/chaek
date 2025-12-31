"use client";

import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/config";
import { fetchTOC } from "@/lib/ai/fetch";
import { BookActions, BookContextState, FlowStatus } from "@/lib/book/types";
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";
import { useSettingsStore } from "./settingsStore";
import { authFetch } from "@/lib/api";

const FLOW_STEPS = [
  "settings",
  "draft",
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
            case "draft":
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

      const saveBook = async () => {
        const {
          content,
          tableOfContents,
          sourceText,
          bookTitle,
          isSavingBook,
        } = get();
        if (isSavingBook) return;

        const title = bookTitle?.trim() || "Untitled Book";

        set({ isSavingBook: true, error: null }, false, "book/saveBook_start");
        try {
          const res = await authFetch("/api/book/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title,
              content,
              tableOfContents,
              sourceText,
            }),
          });

          const json = (await res.json()) as {
            ok?: boolean;
            bookId?: string;
            error?: string;
          };
          if (!res.ok || !json.ok || !json.bookId) {
            throw new Error(json.error || "책 저장에 실패했습니다.");
          }

          set(
            { savedBookId: json.bookId, isSavingBook: false },
            false,
            "book/saveBook_success",
          );
        } catch (error) {
          console.error("Failed to save book:", error);
          set(
            {
              isSavingBook: false,
              error: "책 저장 중 오류가 발생했습니다.",
            },
            false,
            "book/saveBook_error",
          );
        }
      };

      const actions: BookActions = {
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

        updateDraft: (draft) => {
          set(draft, false, "book/updateDraft");
        },

        setActiveBook: (book) => {
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

        generateTOC: async (sourceText) => {
          if (!sourceText.trim()) return;

          set(
            {
              isProcessing: true,
              error: null,
              flowStatus: "generating_toc",
              sourceText,
              bookPlan: undefined,
              completedSteps: new Set([...get().completedSteps, "draft"]),
            },
            false,
            "book/generateTOC_start",
          );

          try {
            const { aiConfiguration } = get();
            const settings = useSettingsStore.getState();
            const { title, toc } = await fetchTOC(
              sourceText,
              aiConfiguration.toc.provider,
              aiConfiguration.toc.model,
              settings,
            );
            set(
              {
                flowStatus: "toc_review",
                bookTitle: title,
                tableOfContents: toc,
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
                flowStatus: "draft",
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

        setFlowStatus: (status) => {
          set({ flowStatus: status }, false, "book/setFlowStatus");
        },

        goToStep: (step) => {
          const state = get();

          if (state.bookGenerationStarted) {
            if (!confirm("진행 중인 생성을 중단하시겠습니까?")) return;
            actions.cancelGeneration();
          }

          if (!canAccessStep(step, state)) return;

          set({ flowStatus: step }, false, "book/goToStep");
        },

        setTocAiConfiguraiton: (provider, model) => {
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

        setSelectedModel: (provider, model) => {
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

        goToChapter: (index) => {
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

        setViewingChapterIndex: (index) => {
          set(
            { viewingChapterIndex: index },
            false,
            "book/setViewingChapterIndex",
          );
        },

        setupGeneration: (bookId) => {
          set(
            {
              savedBookId: bookId,
              error: null,
              generationProgress: { phase: "sections" },
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
        }) => {
          set(
            {
              chapters,
              streamingContent,
              viewingChapterIndex: chapters.length,
              currentChapterIndex,
              generationProgress: { phase: "sections" },
            },
            false,
            "book/syncGenerationProgress",
          );
        },

        failGeneration: (error) => {
          set(
            {
              error,
              awaitingChapterDecision: false,
              currentChapterIndex: null,
              flowStatus: "toc_review",
              generationProgress: { phase: "idle" },
              bookGenerationStarted: false,
            },
            false,
            "book/failGeneration",
          );
        },

        completeGeneration: (content) => {
          const { completedSteps } = get();
          set(
            {
              content,
              flowStatus: "completed",
              currentChapterIndex: null,
              currentChapterContent: "",
              awaitingChapterDecision: false,
              generationProgress: { phase: "idle" },
              bookGenerationStarted: false,
              completedSteps: new Set([...completedSteps, "completed"]),
            },
            false,
            "book/completeGeneration",
          );
        },

        saveBook,
      };

      return { actions };
    }),
  ),
);
