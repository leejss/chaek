"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { bookStoreActions, useBookStore } from "@/lib/book/bookContext";
import { useSettingsStore } from "@/lib/book/settingsStore";
import { Book, GeminiModel, ClaudeModel, Section } from "@/lib/book/types";
import { fetchStreamSection } from "@/lib/ai/fetch";
import { deductCreditsAction } from "@/lib/actions/credits";
import { generatePlanAction, generateOutlineAction } from "@/lib/actions/ai";
import { updateBookAction } from "@/lib/actions/book";
import GenerationStep from "../../_components/GenerationStep";
import Button from "../../../_components/Button";
import StatusOverview from "../../_components/StatusOverview";

interface GenerationViewProps {
  initialBook: Book;
}

export default function GenerationView({ initialBook }: GenerationViewProps) {
  const store = useBookStore();
  const settings = useSettingsStore();
  const abortRef = useRef<AbortController | null>(null);

  const [isDeductingCredits, setIsDeductingCredits] = useState(false);

  useEffect(() => {
    store.actions.initializeFromBook(initialBook);
  }, [initialBook, store.actions]);

  const clearError = useCallback(() => {
    bookStoreActions.updateGenerationProgress({ error: null });
  }, []);

  const handleSectionChunk = useCallback(
    (chunk: string) => {
      const { content, currentChapterContent } = useBookStore.getState();
      store.actions.updateDraft({
        content: content + chunk,
        currentChapterContent: currentChapterContent + chunk,
      });
    },
    [store],
  );

  const handleStart = async () => {
    const {
      tableOfContents,
      sourceText,
      actions: { setupGeneration },
    } = store;

    if (!tableOfContents.length) {
      alert("차례가 없습니다.");
      return;
    }

    if (isDeductingCredits) return;

    abortRef.current = new AbortController();
    setIsDeductingCredits(true);
    clearError();

    try {
      await deductCreditsAction(initialBook.id);

      setupGeneration(initialBook.id);
      bookStoreActions.updateGenerationProgress({
        phase: "planning",
        totalChapters: tableOfContents.length,
        currentChapter: 1,
        currentSection: 0,
        totalSections: 0,
      });

      const bookPlan = await generatePlanAction({
        sourceText: sourceText || "",
        toc: tableOfContents,
        provider: store.aiConfiguration.content.provider,
        model: store.aiConfiguration.content.model as GeminiModel | ClaudeModel,
        settings,
      });

      for (
        let chapterNum = 1;
        chapterNum <= tableOfContents.length;
        chapterNum++
      ) {
        if (abortRef.current?.signal.aborted) {
          throw new Error("생성이 취소되었습니다.");
        }

        bookStoreActions.updateGenerationProgress({
          phase: "outlining",
          currentChapter: chapterNum,
          currentSection: 0,
          currentOutline: undefined,
        });

        const chapterTitle = tableOfContents[chapterNum - 1];

        const chapterOutline = await generateOutlineAction({
          toc: tableOfContents,
          chapterNumber: chapterNum,
          sourceText,
          bookPlan,
          provider: store.aiConfiguration.content.provider,
          model: store.aiConfiguration.content.model as
            | GeminiModel
            | ClaudeModel,
          settings,
        });

        bookStoreActions.updateGenerationProgress({
          phase: "generating_sections",
          currentOutline: chapterOutline,
          totalSections: chapterOutline.sections.length,
          currentSection: 0,
        });

        for (
          let sectionIndex = 0;
          sectionIndex < chapterOutline.sections.length;
          sectionIndex++
        ) {
          if (abortRef.current?.signal.aborted) {
            throw new Error("생성이 취소되었습니다.");
          }

          bookStoreActions.updateGenerationProgress({
            currentSection: sectionIndex,
          });

          const previousSections = chapterOutline.sections
            .slice(0, sectionIndex)
            .map((s: Section) => ({ title: s.title, summary: s.summary }));

          for await (const chunk of fetchStreamSection({
            chapterNumber: chapterNum,
            chapterTitle,
            chapterOutline: chapterOutline.sections,
            sectionIndex,
            previousSections,
            toc: tableOfContents,
            sourceText: sourceText || "",
            bookPlan,
            provider: store.aiConfiguration.content.provider,
            model: store.aiConfiguration.content.model as
              | GeminiModel
              | ClaudeModel,
            settings,
          })) {
            handleSectionChunk(chunk);
          }

          bookStoreActions.updateGenerationProgress({
            currentSection: sectionIndex + 1,
          });
        }

        const { currentChapterContent } = useBookStore.getState();
        bookStoreActions.finishChapter(chapterTitle, currentChapterContent);

        const { content } = useBookStore.getState();
        await updateBookAction(initialBook.id, {
          content,
          status: "generating",
        });

        bookStoreActions.updateGenerationProgress({
          currentChapter: chapterNum + 1,
          currentSection: 0,
          totalSections: 0,
          currentOutline: undefined,
        });
      }

      const { completeGeneration } = store.actions;
      const { content } = useBookStore.getState();
      completeGeneration(content);

      await updateBookAction(initialBook.id, {
        content,
        status: "completed",
      });

      bookStoreActions.updateGenerationProgress({
        phase: "completed",
        currentChapter: tableOfContents.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      bookStoreActions.updateGenerationProgress({
        phase: "error",
        error: message,
      });
      store.actions.failGeneration(message);

      await updateBookAction(initialBook.id, {
        status: "failed",
      });
    } finally {
      setIsDeductingCredits(false);
      abortRef.current = null;
    }
  };

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isActuallyGenerating =
    store.generationProgress.phase !== "idle" &&
    store.generationProgress.phase !== "error" &&
    store.generationProgress.phase !== "completed";

  if (isActuallyGenerating) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <GenerationStep />
        <StatusOverview
          onCancel={handleCancel}
          isGenerating={isActuallyGenerating}
        />
        {store.generationProgress.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {store.generationProgress.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {initialBook.title || "Untitled Book"}
        </h1>
      </div>

      <div className="bg-background border border-neutral-200 rounded-2xl p-8 mb-8">
        <h3 className="text-lg font-bold text-foreground mb-6">
          차례 (Table of Contents)
        </h3>
        <div className="space-y-3">
          {initialBook.tableOfContents.map((chapter, idx) => (
            <div
              key={idx}
              className="flex items-baseline gap-4 text-base p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <span className="font-bold text-neutral-400 w-6 text-right">
                {idx + 1}.
              </span>
              <span className="text-foreground font-medium">{chapter}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={handleStart}
          disabled={isDeductingCredits}
          className="w-full h-14 text-lg font-semibold"
        >
          {isDeductingCredits ? "크레딧 차감 중..." : "책 생성 시작하기"}
        </Button>
      </div>

      {store.generationProgress.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {store.generationProgress.error}
        </div>
      )}
    </div>
  );
}
