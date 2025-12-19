"use client";

import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";
import { generateTableOfContents, streamBookGeneration } from "@/lib/ai/gemini";
import {
  Book,
  BookActions,
  BookContextState,
  BookDraft,
  GeminiModel,
} from "@/lib/book/types";

const isGeminiModel = (value: unknown): value is GeminiModel => {
  return value === GeminiModel.FLASH || value === GeminiModel.PRO;
};

const emptyDraft: BookDraft = {
  status: "draft",
  sourceText: "",
  tableOfContents: [],
  content: "",
  selectedModel: GeminiModel.FLASH,
};

const initialState: BookContextState = {
  books: [],
  currentBook: emptyDraft,
  streamingContent: "",
  isProcessing: false,
  error: null,
};

export const useBookStore = create<
  BookContextState & { actions: BookActions }
>()(
  devtools(
    combine(initialState, (set, get) => {
      const actions: BookActions = {
        startNewBook: () => {
          set(
            {
              currentBook: emptyDraft,
              streamingContent: "",
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
            const toc = await generateTableOfContents(sourceText);
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

        startBookGeneration: async (model) => {
          const { currentBook } = get();
          if (!currentBook.tableOfContents.length) {
            set(
              { error: "차례가 없습니다. 먼저 TOC를 생성하세요." },
              false,
              "book/startBookGeneration_noTOC",
            );
            return;
          }

          // React event handler로 연결될 때 MouseEvent가 들어오는 경우를 방지
          const selectedModel =
            (isGeminiModel(model) ? model : undefined) ||
            currentBook.selectedModel ||
            GeminiModel.FLASH;

          set(
            (state) => ({
              currentBook: {
                ...state.currentBook,
                status: "generating_book",
                selectedModel,
              },
              streamingContent: "",
              error: null,
            }),
            false,
            "book/startBookGeneration_start",
          );

          try {
            let fullContent = "";
            for await (const chunk of streamBookGeneration(
              currentBook.tableOfContents,
              currentBook.sourceText || "",
              selectedModel,
            )) {
              fullContent += chunk;
              set(
                { streamingContent: fullContent },
                false,
                "book/streaming_content",
              );
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
              }),
              false,
              "book/startBookGeneration_success",
            );
          } catch (err) {
            console.error("Book generation failed:", err);
            set(
              (state) => ({
                error: "본문 생성 중 오류가 발생했습니다.",
                currentBook: { ...state.currentBook, status: "toc_review" },
              }),
              false,
              "book/startBookGeneration_error",
            );
          }
        },

        setSelectedModel: (model) => {
          set(
            (state) => ({
              currentBook: { ...state.currentBook, selectedModel: model },
            }),
            false,
            "book/setSelectedModel",
          );
        },

        getBookById: (id) => {
          return get().books.find((b) => b.id === id);
        },
      };

      return { actions };
    }),
  ),
);
