"use client";

import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/config";
import {
  fetchBookById,
  fetchBooks,
  fetchOutline,
  fetchPlan,
  fetchStreamSection,
  fetchTOC,
} from "@/lib/ai/fetch";
import { BookActions, BookContextState, FlowStatus, Section } from "@/lib/book/types";
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";
import { useSettingsStore } from "./settingsStore";

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
  userBooks: [],
  isLoadingBooks: false,
  completedSteps: new Set(["settings"]),
  bookGenerationStarted: false,
};

export const useBookStore = create(
  devtools(
    combine(initialState, (set, get) => {
      let chapterDecisionResolver:
        | ((decision: "confirm" | "cancel") => void)
        | null = null;
      let generationCancelled = false;

      const waitForChapterDecision = () => {
        return new Promise<"confirm" | "cancel">((resolve) => {
          chapterDecisionResolver = resolve;
        });
      };

      const resolveChapterDecision = (decision: "confirm" | "cancel") => {
        if (chapterDecisionResolver) {
          chapterDecisionResolver(decision);
          chapterDecisionResolver = null;
        }
      };

      const canAccessStep = (step: FlowStatus, state: BookContextState): boolean => {
        if (!FLOW_STEPS.includes(step as (typeof FLOW_STEPS)[number])) {
          return false;
        }

        const currentIndex = FLOW_STEPS.indexOf(
          state.flowStatus as (typeof FLOW_STEPS)[number],
        );
        const targetIndex = FLOW_STEPS.indexOf(step as (typeof FLOW_STEPS)[number]);

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
        const { content, tableOfContents, sourceText, bookTitle, isSavingBook } = get();
        if (isSavingBook) return;

        const title = bookTitle?.trim() || "Untitled Book";

        set({ isSavingBook: true, error: null }, false, "book/saveBook_start");
        try {
          const res = await fetch("/api/book/save", {
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
          generationCancelled = false;
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
                completedSteps: new Set([...get().completedSteps, "toc_review"]),
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

        startBookGeneration: async (provider, model) => {
          const { tableOfContents, sourceText } = get();

          if (!tableOfContents.length) {
            set(
              { error: "차례가 없습니다. 먼저 TOC를 생성하세요." },
              false,
              "book/startBookGeneration_noTOC",
            );
            return;
          }

          set(
            {
              error: null,
              generationProgress: { phase: "idle" },
              bookGenerationStarted: true,
            },
            false,
            "book/startBookGeneration_start",
          );

          try {
            generationCancelled = false;

            const settings = useSettingsStore.getState();
            set(
              {
                flowStatus: "generating",
                generationProgress: { phase: "plan" },
              },
              false,
              "book/generating_plan",
            );

            const bookPlan = await fetchPlan(
              sourceText || "",
              tableOfContents,
              provider,
              model,
              settings,
            );

            if (generationCancelled) {
              // handle cancellation
            }

            set({ bookPlan }, false, "book/plan_generated");

            let fullContent = "";

            for (let i = 0; i < tableOfContents.length; i++) {
              if (generationCancelled) break;

              const chapterTitle = tableOfContents[i];
              const chapterNumber = i + 1;

              set(
                {
                  currentChapterIndex: i,
                  currentChapterContent: "",
                  awaitingChapterDecision: false,
                  error: null,
                  flowStatus: "generating",
                  generationProgress: { phase: "outline" },
                },
                false,
                "book/generating_outline",
              );

              // fetchOutline matches signature update
              const outline = await fetchOutline({
                toc: tableOfContents,
                chapterNumber,
                sourceText: sourceText || "",
                bookPlan,
                provider: provider,
                model: model,
                settings,
              });

              if (generationCancelled) break;

              set(
                {
                  flowStatus: "generating",
                  generationProgress: {
                    phase: "sections",
                    currentSection: 0,
                    totalSections: outline.sections.length,
                    currentOutline: outline,
                  },
                },
                false,
                "book/outline_generated",
              );

              let chapterContent = `## ${chapterTitle}\n\n`;
              const completedSections: Section[] = [];

              for (let j = 0; j < outline.sections.length; j++) {
                if (generationCancelled) break;

                set(
                  (state) => ({
                    generationProgress: {
                      ...state.generationProgress,
                      phase: "sections",
                      currentSection: j + 1,
                      totalSections: outline.sections.length,
                    },
                  }),
                  false,
                  "book/generating_section",
                );

                let sectionContent = "";
                for await (const chunk of fetchStreamSection({
                  chapterNumber,
                  chapterTitle,
                  chapterOutline: outline.sections,
                  sectionIndex: j,
                  previousSections: completedSections,
                  toc: tableOfContents,
                  sourceText: sourceText || "",
                  bookPlan,
                  provider: provider,
                  model: model,
                  settings,
                })) {
                  if (generationCancelled) break;

                  sectionContent += chunk;
                  set(
                    {
                      currentChapterContent: chapterContent + sectionContent,
                      streamingContent:
                        fullContent + chapterContent + sectionContent,
                    },
                    false,
                    "book/streaming_section_content",
                  );
                }

                completedSections.push({
                  ...outline.sections[j],
                  content: sectionContent,
                });
                chapterContent += sectionContent + "\n\n";
              }

              if (generationCancelled) break;

              if (settings.requireConfirm) {
                set(
                  {
                    awaitingChapterDecision: true,
                    flowStatus: "generating",
                    generationProgress: { phase: "review" },
                  },
                  false,
                  "book/chapter_review_start",
                );

                const decision = await waitForChapterDecision();
                if (decision === "cancel") {
                  generationCancelled = true;
                  break;
                }
              }

              fullContent += chapterContent;
              set(
                (state) => ({
                  chapters: [
                    ...state.chapters,
                    {
                      chapterNumber,
                      chapterTitle,
                      content: chapterContent,
                      isComplete: true,
                    },
                  ],
                  viewingChapterIndex: state.chapters.length,
                  streamingContent: fullContent,
                  awaitingChapterDecision: false,
                  currentChapterContent: "",
                  flowStatus: "generating",
                  generationProgress: { phase: "idle" },
                }),
                false,
                "book/chapter_confirmed",
              );
            }

            if (generationCancelled) {
              set(
                {
                  error: "생성이 취소되었습니다.",
                  awaitingChapterDecision: false,
                  currentChapterIndex: null,
                  currentChapterContent: "",
                  flowStatus: "toc_review",
                  generationProgress: { phase: "idle" },
                },
                false,
                "book/generation_cancelled",
              );
              return;
            }

            set(
              {
                content: fullContent,
                flowStatus: "completed",
                currentChapterIndex: null,
                currentChapterContent: "",
                awaitingChapterDecision: false,
                generationProgress: { phase: "idle" },
                bookGenerationStarted: false,
                completedSteps: new Set([...get().completedSteps, "completed"]),
              },
              false,
              "book/startBookGeneration_success",
            );

            await saveBook();
          } catch (err) {
            console.error("Book generation failed:", err);
            set(
              {
                error: "본문 생성 중 오류가 발생했습니다.",
                awaitingChapterDecision: false,
                currentChapterIndex: null,
                currentChapterContent: "",
                flowStatus: "toc_review",
                generationProgress: { phase: "idle" },
                bookGenerationStarted: false,
              },
              false,
              "book/startBookGeneration_error",
            );
          }
        },

        confirmChapter: () => {
          set({ awaitingChapterDecision: false }, false, "book/confirmChapter");
          resolveChapterDecision("confirm");
        },

        cancelGeneration: () => {
          generationCancelled = true;
          set(
            {
              awaitingChapterDecision: false,
              currentChapterIndex: null,
              currentChapterContent: "",
              bookGenerationStarted: false,
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

        saveBook,

        getBookById: (_id) => {
          void _id;
          // Stub: return undefined for now as global library is not yet implemented in store
          return undefined;
        },

        fetchUserBooks: async () => {
          try {
            set({ isLoadingBooks: true, error: null }, false, "book/fetchUserBooks_start");
            const books = await fetchBooks();
            set(
              { userBooks: books, isLoadingBooks: false },
              false,
              "book/fetchUserBooks_success",
            );
          } catch (error) {
            console.error("Failed to fetch books:", error);
            set(
              { error: "책 목록을 불러오지 못했습니다.", isLoadingBooks: false },
              false,
              "book/fetchUserBooks_error",
            );
          }
        },

        fetchBookById: async (id: string) => {
          try {
            const book = await fetchBookById(id);
            return book;
          } catch (error) {
            console.error("Failed to fetch book:", error);
            return undefined;
          }
        },
      };

      return { actions };
    }),
  ),
);
