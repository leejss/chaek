"use client";

import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";
import { fetchOutline, fetchStreamSection, fetchTOC } from "@/lib/ai/fetch";
import {
  Book,
  BookActions,
  BookContextState,
  BookDraft,
  ClaudeModel,
  GeminiModel,
  Section,
} from "@/lib/book/types";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, isValidModel } from "@/lib/ai/config";

const emptyDraft: BookDraft = {
  status: "draft",
  sourceText: "",
  tableOfContents: [],
  content: "",
  selectedProvider: DEFAULT_PROVIDER,
  selectedModel: DEFAULT_MODEL,
};

const initialState: BookContextState = {
  books: [],
  currentBook: emptyDraft,
  chapters: [],
  viewingChapterIndex: 0,
  streamingContent: "",
  currentChapterIndex: null,
  currentChapterContent: "",
  awaitingChapterDecision: false,
  isProcessing: false,
  error: null,
  generationProgress: { phase: "idle" },
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

      const actions: BookActions = {
        startNewBook: () => {
          generationCancelled = false;
          resolveChapterDecision("cancel");
          set(
            {
              currentBook: emptyDraft,
              chapters: [],
              viewingChapterIndex: 0,
              streamingContent: "",
              currentChapterIndex: null,
              currentChapterContent: "",
              awaitingChapterDecision: false,
              error: null,
            },
            false,
            "book/startNewBook",
          );
        },

        updateDraft: (draft) => {
          set(
            (state) => ({
              currentBook: { ...state.currentBook, ...draft },
            }),
            false,
            "book/updateDraft",
          );
        },

        setActiveBook: (book) => {
          set(
            {
              currentBook: {
                ...book,
                sourceText: book.sourceText || "",
              } as BookDraft,
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
            (state) => ({
              isProcessing: true,
              error: null,
              currentBook: {
                ...state.currentBook,
                sourceText,
                status: "generating_toc",
              },
            }),
            false,
            "book/generateTOC_start",
          );

          try {
            const { currentBook } = get();
            const toc = await fetchTOC(
              sourceText,
              currentBook.selectedProvider,
              currentBook.selectedModel,
            );
            set(
              (state) => ({
                currentBook: {
                  ...state.currentBook,
                  tableOfContents: toc,
                  status: "toc_review",
                },
              }),
              false,
              "book/generateTOC_success",
            );
          } catch (err) {
            console.error("TOC generation failed:", err);
            set(
              (state) => ({
                error: "TOC 생성에 실패했습니다. 다시 시도해 주세요.",
                currentBook: { ...state.currentBook, status: "draft" },
              }),
              false,
              "book/generateTOC_error",
            );
          } finally {
            set({ isProcessing: false }, false, "book/generateTOC_finally");
          }
        },

        regenerateTOC: async () => {
          const { currentBook } = get();
          await actions.generateTOC(currentBook.sourceText || "");
        },

        startBookGeneration: async (provider, model) => {
          const { currentBook } = get();
          if (!currentBook.tableOfContents.length) {
            set(
              { error: "차례가 없습니다. 먼저 TOC를 생성하세요." },
              false,
              "book/startBookGeneration_noTOC",
            );
            return;
          }

          const selectedProvider =
            provider || currentBook.selectedProvider || DEFAULT_PROVIDER;

          const selectedModel =
            (model && typeof model === "string" && isValidModel(model)
              ? (model as GeminiModel | ClaudeModel)
              : undefined) ||
            currentBook.selectedModel ||
            DEFAULT_MODEL;

          set(
            (state) => ({
              currentBook: {
                ...state.currentBook,
                status: "generating_outlines",
                selectedProvider,
                selectedModel,
              },
              chapters: [],
              viewingChapterIndex: 0,
              streamingContent: "",
              currentChapterIndex: 0,
              currentChapterContent: "",
              awaitingChapterDecision: false,
              error: null,
              generationProgress: { phase: "idle" },
            }),
            false,
            "book/startBookGeneration_start",
          );

          try {
            generationCancelled = false;
            let fullContent = "";

            for (let i = 0; i < currentBook.tableOfContents.length; i++) {
              if (generationCancelled) break;

              const chapterTitle = currentBook.tableOfContents[i];
              const chapterNumber = i + 1;

              set(
                {
                  currentChapterIndex: i,
                  currentChapterContent: "",
                  awaitingChapterDecision: false,
                  error: null,
                  currentBook: {
                    ...get().currentBook,
                    status: "generating_outlines",
                  },
                  generationProgress: { phase: "outline" },
                },
                false,
                "book/generating_outline",
              );

              const outline = await fetchOutline({
                toc: currentBook.tableOfContents,
                chapterNumber,
                sourceText: currentBook.sourceText || "",
                provider: selectedProvider,
                model: selectedModel,
              });

              if (generationCancelled) break;

              set(
                (state) => ({
                  currentBook: {
                    ...state.currentBook,
                    status: "generating_sections",
                  },
                  generationProgress: {
                    phase: "sections",
                    currentSection: 0,
                    totalSections: outline.sections.length,
                    currentOutline: outline,
                  },
                }),
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
                  toc: currentBook.tableOfContents,
                  sourceText: currentBook.sourceText || "",
                  provider: selectedProvider,
                  model: selectedModel,
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

              set(
                (state) => ({
                  awaitingChapterDecision: true,
                  currentBook: {
                    ...state.currentBook,
                    status: "chapter_review",
                  },
                  generationProgress: { phase: "review" },
                }),
                false,
                "book/chapter_review_start",
              );

              const decision = await waitForChapterDecision();
              if (decision === "cancel") {
                generationCancelled = true;
                break;
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
                  currentBook: {
                    ...get().currentBook,
                    status: "generating_outlines",
                  },
                  generationProgress: { phase: "idle" },
                }),
                false,
                "book/chapter_confirmed",
              );
            }

            if (generationCancelled) {
              set(
                (state) => ({
                  error: "생성이 취소되었습니다.",
                  awaitingChapterDecision: false,
                  currentChapterIndex: null,
                  currentChapterContent: "",
                  currentBook: { ...state.currentBook, status: "toc_review" },
                  generationProgress: { phase: "idle" },
                }),
                false,
                "book/generation_cancelled",
              );
              return;
            }

            const newBook: Book = {
              id: Date.now().toString(),
              title: currentBook.tableOfContents[0] || "Untitled Book",
              createdAt: new Date().toISOString(),
              sourceText: currentBook.sourceText,
              tableOfContents: currentBook.tableOfContents,
              content: fullContent,
              status: "completed",
              selectedModel,
            };

            set(
              (state) => ({
                books: [newBook, ...state.books],
                currentBook: {
                  ...newBook,
                  sourceText: newBook.sourceText || "",
                } as BookDraft,
                currentChapterIndex: null,
                currentChapterContent: "",
                awaitingChapterDecision: false,
                generationProgress: { phase: "idle" },
              }),
              false,
              "book/startBookGeneration_success",
            );
          } catch (err) {
            console.error("Book generation failed:", err);
            set(
              (state) => ({
                error: "본문 생성 중 오류가 발생했습니다.",
                awaitingChapterDecision: false,
                currentChapterIndex: null,
                currentChapterContent: "",
                currentBook: { ...state.currentBook, status: "toc_review" },
                generationProgress: { phase: "idle" },
              }),
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
            },
            false,
            "book/cancelGeneration",
          );
          resolveChapterDecision("cancel");
        },

        setSelectedModel: (provider, model) => {
          set(
            (state) => ({
              currentBook: {
                ...state.currentBook,
                selectedProvider: provider,
                selectedModel: model,
              },
            }),
            false,
            "book/setSelectedModel",
          );
        },

        getBookById: (id) => {
          return get().books.find((b) => b.id === id);
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
      };

      return { actions };
    }),
  ),
);
