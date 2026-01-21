"use client";

import { BookState, Step } from "@/context/types/book";
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";

const STEPS: Step[] = ["settings", "source_input", "toc_review"];

const initialState: BookState = {
  sourceText: "",
  bookTitle: "",
  tableOfContents: [],
  loadingState: "idle",
  error: null,
  completedSteps: new Set<Step>(["settings"]),
};

type UpdatableBookFields = "sourceText" | "bookTitle" | "tableOfContents";

export const useBookStore = create(
  devtools(
    combine(initialState, (set, get) => {
      const actions = {
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

        clearError: () => {
          set({ error: null, loadingState: "idle" }, false, "book/clearError");
        },
      };

      return { actions };
    }),
  ),
);

export const bookStoreActions = useBookStore.getState().actions;
