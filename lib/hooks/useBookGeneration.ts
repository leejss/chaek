"use client";

import useSWRMutation from "swr/mutation";
import { authFetch } from "@/lib/api";
import { useBookStore } from "@/lib/book/bookContext";
import { useGenerationStore } from "@/lib/book/generationContext";
import { useSettingsStore } from "@/lib/book/settingsStore";
import { AIProvider, GeminiModel, ClaudeModel } from "@/lib/book/types";
import { fetchBookById } from "@/lib/ai/fetch";

interface GenerateParams {
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
}

export function useBookGeneration() {
  const bookStore = useBookStore();
  const genStore = useGenerationStore((state) => state);
  const settings = useSettingsStore();

  const { trigger, isMutating, error } = useSWRMutation(
    "book-generation",
    async (_key: string, { arg }: { arg: GenerateParams }) => {
      const { provider, model } = arg;
      const { tableOfContents, sourceText, bookTitle } = bookStore;

      if (!tableOfContents.length) {
        throw new Error("차례가 없습니다. 먼저 TOC를 생성하세요.");
      }

      const bookId = genStore.savedBookId || crypto.randomUUID();
      genStore.actions.setSavedBookId(bookId);
      genStore.actions.setupGeneration(tableOfContents.length);
      const startRes = await authFetch(`/api/books/${bookId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle?.trim() || "Untitled Book",
          tableOfContents,
          sourceText: sourceText || "",
          provider,
          model,
          language: settings.language,
          userPreference: settings.userPreference,
        }),
      });

      const startJson = (await startRes.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!startRes.ok || !startJson.ok) {
        throw new Error(startJson.error || "생성 시작에 실패했습니다.");
      }

      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      while (true) {
        if (genStore.generationCancelled) {
          break;
        }

        const statusRes = await authFetch(`/api/books/${bookId}/status`);
        const statusJson = (await statusRes.json()) as {
          ok?: boolean;
          status?: "draft" | "generating" | "completed" | "failed";
          error?: string | null;
          totalChapters?: number;
          completedChapters?: number;
          chapters?: Array<{
            chapterNumber: number;
            title: string;
            status: "pending" | "generating" | "completed" | "failed";
            content?: string;
          }>;
        };

        if (!statusRes.ok || !statusJson.ok) {
          throw new Error("상태 조회에 실패했습니다.");
        }

        if (statusJson.status === "failed") {
          throw new Error(statusJson.error || "생성에 실패했습니다.");
        }

        const completed =
          statusJson.chapters?.filter(
            (c) => c.status === "completed" && typeof c.content === "string",
          ) || [];

        const chapterContents = completed.map((c) => ({
          chapterNumber: c.chapterNumber,
          chapterTitle: c.title,
          content: c.content || "",
          isComplete: true,
        }));

        const completedCount = statusJson.completedChapters ?? completed.length;
        const totalCount = statusJson.totalChapters ?? tableOfContents.length;
        const currentIndex =
          completedCount >= totalCount
            ? null
            : Math.min(completedCount, totalCount - 1);

        const fullContent = chapterContents.map((c) => c.content).join("\n\n");

        genStore.actions.syncGenerationProgress({
          chapters: chapterContents,
          streamingContent: fullContent,
          currentChapterIndex: currentIndex,
        });

        if (statusJson.status === "completed") {
          genStore.actions.setContent(fullContent);
          genStore.actions.completeGeneration();
          return;
        }

        await sleep(2500);
      }

      genStore.actions.failGeneration("생성이 취소되었습니다.");
    },
  );

  const cancel = () => {
    genStore.actions.cancelGeneration();
  };

  return {
    generate: trigger,
    cancel,
    isGenerating: isMutating,
    error,
  };
}
