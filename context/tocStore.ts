"use client";

import { Step } from "@/context/types/book";
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";

const STEPS: Step[] = ["settings", "source_input", "toc_review"];

type TocGenerationState =
  | { status: "idle" }
  | { status: "loading"; variant: "initial" | "regenerate" }
  | { status: "error"; message: string };

type BookState = {
  sourceText: string;
  bookTitle: string;
  tableOfContents: string[];
  tocGeneration: TocGenerationState;
  completedSteps: Set<Step>;
};

const initialState: BookState = {
  sourceText: "",
  bookTitle: "",
  tableOfContents: [],
  tocGeneration: { status: "idle" },
  completedSteps: new Set<Step>(["settings"]),
};

type UpdatableBookFields = "sourceText" | "bookTitle" | "tableOfContents";
export const useTocGenerationStore = create(
  devtools(
    combine(initialState, (set, get) => {
      const actions = {
        startTocGeneration: (variant: "initial" | "regenerate") => {
          set(
            { tocGeneration: { status: "loading", variant } },
            false,
            `book/tocGeneration/start/${variant}`,
          );
        },

        failTocGeneration: (message: string) => {
          set(
            { tocGeneration: { status: "error", message } },
            false,
            "book/tocGeneration/fail",
          );
        },

        clearTocGenerationError: () => {
          set(
            { tocGeneration: { status: "idle" } },
            false,
            "book/tocGeneration/clearError",
          );
        },

        update: <K extends UpdatableBookFields>(
          key: K,
          value: BookState[K],
        ) => {
          set(
            { [key]: value } as Partial<BookState>,
            false,
            `book/update/${key}`,
          );
        },

        setTocResult: (title: string, chapters: string[]) => {
          set(
            {
              bookTitle: title,
              tableOfContents: chapters,
              tocGeneration: { status: "idle" },
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

        canAccessStep: (step: Step): boolean => {
          const state = get();
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
      };

      return { actions };
    }),
  ),
);

export const updateTocStore = useTocGenerationStore.getState().actions.update;
export const setTocResult =
  useTocGenerationStore.getState().actions.setTocResult;
export const canAccessStep =
  useTocGenerationStore.getState().actions.canAccessStep;
export const completeStep =
  useTocGenerationStore.getState().actions.completeStep;
export const startTocGeneration =
  useTocGenerationStore.getState().actions.startTocGeneration;
export const failTocGeneration =
  useTocGenerationStore.getState().actions.failTocGeneration;
export const clearTocGenerationError =
  useTocGenerationStore.getState().actions.clearTocGenerationError;
