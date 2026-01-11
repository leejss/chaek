"use client";

import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  AIProvider,
  ClaudeModel,
  GeminiModel,
} from "@/lib/ai/config";
import { Book, BookContextState, Step, LoadingState } from "@/lib/book/types";
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";

const STEPS: Step[] = ["settings", "source_input", "toc_review"];

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
  loadingState: "idle",
  error: null,
  completedSteps: new Set<Step>(["settings"]),
  savedBookId: null,
  isSavingBook: false,
};

export const useBookStore = create(
  devtools(
    combine(initialState, (set, get) => {
      const canAccessStep = (step: Step, state: BookContextState): boolean => {
        if (!STEPS.includes(step)) return false;
        if (state.completedSteps.has(step)) return true;

        switch (step) {
          case "settings":
            return true;
          case "source_input":
            return state.completedSteps.has("settings");
          case "toc_review":
            return state.tableOfContents.length > 0;
          default:
            return false;
        }
      };

      const actions = {
        startNewBook: () => {
          set(
            {
              sourceText: "",
              bookTitle: "",
              tableOfContents: [],
              loadingState: "idle",
              error: null,
              completedSteps: new Set<Step>(["settings"]),
            },
            false,
            "book/startNewBook",
          );
        },

        updateDraft: (
          draft: Partial<
            Pick<
              BookContextState,
              "sourceText" | "bookTitle" | "tableOfContents"
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
              loadingState: "generating",
              error: null,
            },
            false,
            "book/initializeFromBook",
          );
        },

        setTocResult: (title: string, chapters: string[]) => {
          set(
            {
              bookTitle: title,
              tableOfContents: chapters,
              completedSteps: new Set<Step>([
                ...get().completedSteps,
                "source_input",
                "toc_review",
              ]),
            },
            false,
            "book/setTocResult",
          );
        },

        setLoadingState: (state: LoadingState) => {
          set({ loadingState: state }, false, "book/setLoadingState");
        },

        canAccessStep: (step: Step): boolean => {
          return canAccessStep(step, get());
        },

        completeStep: (step: Step) => {
          set(
            {
              completedSteps: new Set<Step>([...get().completedSteps, step]),
            },
            false,
            "book/completeStep",
          );
        },

        clearError: () => {
          set({ error: null, loadingState: "idle" }, false, "book/clearError");
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
