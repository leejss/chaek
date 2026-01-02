"use client";

import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/config";
import { fetchTableOfContent } from "@/lib/ai/fetch";
import {
  AIProvider,
  Book,
  BookContextState,
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
  isProcessing: false,
  error: null,
  completedSteps: new Set(["settings"]),
  savedBookId: null,
  isSavingBook: false,
};

export const useBookStore = create(
  devtools(
    combine(initialState, (set, get) => {
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

        if (targetIndex === currentIndex + 1) {
          switch (step) {
            case "source_input":
              return true;
            case "toc_review":
              return state.tableOfContents.length > 0;
            case "generating":
              return state.tableOfContents.length > 0;
            case "completed":
              return false;
            default:
              return true;
          }
        }

        return false;
      };

      const actions = {
        startNewBook: () => {
          set(
            {
              sourceText: "",
              bookTitle: "",
              tableOfContents: [],
              flowStatus: "settings",
              error: null,
              completedSteps: new Set(["settings"]),
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
            >
          >,
        ) => {
          set(draft, false, "book/updateDraft");
        },

        setActiveBook: (book: Book) => {
          set(
            {
              sourceText: book.sourceText || "",
              tableOfContents: book.tableOfContents || [],
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
              flowStatus: "generating",
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

        setFlowStatus: (status: FlowStatus) => {
          set({ flowStatus: status }, false, "book/setFlowStatus");
        },

        goToStep: (step: FlowStatus) => {
          const state = get();

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
      };

      return { actions };
    }),
  ),
);

export const bookStoreActions = useBookStore.getState().actions;
