"use client";

import { useRef, useState, useCallback } from "react";
import { useGenerationStore, useGenerationStoreApi } from "@/lib/book/generationContext";
import { BookSettings } from "@/lib/book/settings";
import { ClaudeModel, GeminiModel, Section } from "@/lib/book/types";
import { fetchStreamSection } from "@/lib/ai/fetch";
import { deductCreditsAction } from "@/lib/actions/credits";
import { generatePlanAction, generateOutlineAction } from "@/lib/actions/ai";
import { updateBookAction } from "@/lib/actions/book";
import GenerationStep from "../../_components/GenerationStep";
import Button from "../../../_components/Button";
import StatusOverviewGeneration from "../../_components/StatusOverviewGeneration";

export default function GenerationView() {
  const storeApi = useGenerationStoreApi();
  const actions = useGenerationStore((state) => state.actions);
  const generationProgress = useGenerationStore((state) => state.generationProgress);
  const bookTitle = useGenerationStore((state) => state.bookTitle);
  const tableOfContents = useGenerationStore((state) => state.tableOfContents);
  const sourceText = useGenerationStore((state) => state.sourceText);
  const generationSettings = useGenerationStore((state) => state.generationSettings);
  const savedBookId = useGenerationStore((state) => state.savedBookId);
  const abortRef = useRef<AbortController | null>(null);
  const [isDeductingCredits, setIsDeductingCredits] = useState(false);

  const clearError = useCallback(() => {
    actions.updateGenerationProgress({ error: null });
  }, [actions]);

  const handleSectionChunk = useCallback(
    (chunk: string) => {
      const { streamingContent, currentChapterContent } = storeApi.getState();
      actions.updateDraft({
        streamingContent: streamingContent + chunk,
        currentChapterContent: currentChapterContent + chunk,
      });
    },
    [actions, storeApi],
  );

  const handleStart = async () => {
    if (!savedBookId) {
      alert("책 ID가 없습니다.");
      return;
    }

    if (!tableOfContents.length) {
      alert("차례가 없습니다.");
      return;
    }

    if (isDeductingCredits) return;

    abortRef.current = new AbortController();
    setIsDeductingCredits(true);
    clearError();

    try {
      await deductCreditsAction(savedBookId);

      actions.setupGeneration(tableOfContents.length);
      actions.updateGenerationProgress({
        phase: "planning",
        totalChapters: tableOfContents.length,
        currentChapter: 1,
        currentSection: 0,
        totalSections: 0,
      });

      const settings: BookSettings = {
        language: generationSettings.language,
        chapterCount: generationSettings.chapterCount,
        userPreference: generationSettings.userPreference,
      };

      const bookPlan = await generatePlanAction({
        bookId: savedBookId,
        sourceText: sourceText || "",
        toc: tableOfContents,
        provider: generationSettings.provider,
        model: generationSettings.model as GeminiModel | ClaudeModel,
        settings,
      });

      actions.setBookPlan(bookPlan);

      for (let chapterNum = 1; chapterNum <= tableOfContents.length; chapterNum++) {
        if (abortRef.current?.signal.aborted) {
          throw new Error("생성이 취소되었습니다.");
        }

        actions.updateGenerationProgress({
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
          provider: generationSettings.provider,
          model: generationSettings.model as GeminiModel | ClaudeModel,
          settings,
        });

        actions.updateGenerationProgress({
          phase: "generating_sections",
          currentOutline: chapterOutline,
          totalSections: chapterOutline.sections.length,
          currentSection: 0,
        });

        for (let sectionIndex = 0; sectionIndex < chapterOutline.sections.length; sectionIndex++) {
          if (abortRef.current?.signal.aborted) {
            throw new Error("생성이 취소되었습니다.");
          }

          actions.updateGenerationProgress({
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
            provider: generationSettings.provider,
            model: generationSettings.model as GeminiModel | ClaudeModel,
            settings,
          })) {
            handleSectionChunk(chunk);
          }

          actions.updateGenerationProgress({
            currentSection: sectionIndex + 1,
          });
        }

        const { currentChapterContent, streamingContent } = storeApi.getState();
        actions.finishChapter(chapterTitle, currentChapterContent);
        actions.setContent(streamingContent);
        await updateBookAction(savedBookId, {
          content: streamingContent,
          status: "generating",
        });

        actions.updateGenerationProgress({
          currentChapter: chapterNum + 1,
          currentSection: 0,
          totalSections: 0,
          currentOutline: undefined,
        });
      }

      actions.completeGeneration();
      const { streamingContent } = storeApi.getState();
      actions.setContent(streamingContent);
      await updateBookAction(savedBookId, {
        content: streamingContent,
        status: "completed",
      });

      actions.updateGenerationProgress({
        phase: "completed",
        currentChapter: tableOfContents.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      actions.updateGenerationProgress({
        phase: "error",
        error: message,
      });
      actions.failGeneration(message);

      if (savedBookId) {
        await updateBookAction(savedBookId, {
        status: "failed",
      });
      }
    } finally {
      setIsDeductingCredits(false);
      abortRef.current = null;
    }
  };

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isActuallyGenerating =
    generationProgress.phase !== "idle" &&
    generationProgress.phase !== "error" &&
    generationProgress.phase !== "completed";

  if (isActuallyGenerating) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <GenerationStep />
        <StatusOverviewGeneration onCancel={handleCancel} isGenerating={isActuallyGenerating} />
        {generationProgress.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {generationProgress.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">{bookTitle || "Untitled Book"}</h1>
      </div>

      <div className="bg-background border border-neutral-200 rounded-2xl p-8 mb-8">
        <h3 className="text-lg font-bold text-foreground mb-6">차례 (Table of Contents)</h3>
        <div className="space-y-3">
          {tableOfContents.map((chapter, idx) => (
            <div
              key={idx}
              className="flex items-baseline gap-4 text-base p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <span className="font-bold text-neutral-400 w-6 text-right">{idx + 1}.</span>
              <span className="text-foreground font-medium">{chapter}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Button onClick={handleStart} disabled={isDeductingCredits} className="w-full h-14 text-lg font-semibold">
          {isDeductingCredits ? "크레딧 차감 중..." : "책 생성 시작하기"}
        </Button>
      </div>

      {generationProgress.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {generationProgress.error}
        </div>
      )}
    </div>
  );
}
