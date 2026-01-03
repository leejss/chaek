"use client";

import { useRef, useState, useCallback } from "react";
import {
  useGenerationStore,
  useGenerationStoreApi,
} from "@/lib/book/generationContext";
import { BookSettings } from "@/lib/book/settings";
import { ClaudeModel, GeminiModel, Section } from "@/lib/book/types";
import { fetchStreamSection } from "@/lib/ai/fetch";
import { deductCreditsAction } from "@/lib/actions/credits";
import { generatePlanAction, generateOutlineAction } from "@/lib/actions/ai";
import { updateBookAction, saveChapterAction } from "@/lib/actions/book";
import GenerationStep from "../../_components/GenerationStep";
import StatusOverviewGeneration from "../../_components/StatusOverviewGeneration";
import Button from "../../../_components/Button";

export default function GenerationView() {
  const storeApi = useGenerationStoreApi();
  const actions = useGenerationStore((state) => state.actions);
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  );
  const bookTitle = useGenerationStore((state) => state.bookTitle);
  const bookStatus = useGenerationStore((state) => state.bookStatus);
  const tableOfContents = useGenerationStore((state) => state.tableOfContents);
  const sourceText = useGenerationStore((state) => state.sourceText);
  const chapters = useGenerationStore((state) => state.chapters);
  const generationSettings = useGenerationStore(
    (state) => state.generationSettings,
  );
  const savedBookId = useGenerationStore((state) => state.savedBookId);
  const abortRef = useRef<AbortController | null>(null);
  const [isDeductingCredits, setIsDeductingCredits] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

    if (isProcessing) return;

    abortRef.current = new AbortController();
    setIsProcessing(true);
    clearError();

    try {
      // 1. Deduct credits only if starting for the first time
      if (chapters.length === 0) {
        setIsDeductingCredits(true);
        await deductCreditsAction(savedBookId);
        setIsDeductingCredits(false);

        actions.setupGeneration(tableOfContents.length);
      } else {
        // Prepare for resume: update progress phase
        actions.updateGenerationProgress({
          phase: "planning",
          totalChapters: tableOfContents.length,
          currentChapter: chapters.length + 1,
        });
      }

      const settings: BookSettings = {
        language: generationSettings.language,
        chapterCount: generationSettings.chapterCount,
        userPreference: generationSettings.userPreference,
      };

      // 2. Planning (Ensure plan exists)
      let bookPlan = storeApi.getState().bookPlan;
      if (!bookPlan) {
        actions.updateGenerationProgress({ phase: "planning" });
        bookPlan = await generatePlanAction({
          bookId: savedBookId,
          sourceText: sourceText || "",
          toc: tableOfContents,
          provider: generationSettings.provider,
          model: generationSettings.model as GeminiModel | ClaudeModel,
          settings,
        });
        actions.setBookPlan(bookPlan);
      }

      // 3. Generation Loop (Start from the next missing chapter)
      const startChapterNum = chapters.length + 1;

      for (
        let chapterNum = startChapterNum;
        chapterNum <= tableOfContents.length;
        chapterNum++
      ) {
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

        // 3a. Generate Outline
        const chapterOutline = await generateOutlineAction({
          toc: tableOfContents,
          chapterNumber: chapterNum,
          sourceText,
          bookPlan,
          provider: generationSettings.provider,
          model: generationSettings.model as GeminiModel | ClaudeModel,
          settings,
        });

        // Add Chapter Header to draft
        {
          const { streamingContent } = storeApi.getState();
          const chapterHeader = `\n\n## ${chapterTitle}\n\n`;
          actions.updateDraft({
            streamingContent: streamingContent + chapterHeader,
            currentChapterContent: chapterHeader,
          });
        }

        actions.updateGenerationProgress({
          phase: "generating_sections",
          currentOutline: chapterOutline,
          totalSections: chapterOutline.sections.length,
          currentSection: 0,
        });

        // 3b. Generate Sections
        for (
          let sectionIndex = 0;
          sectionIndex < chapterOutline.sections.length;
          sectionIndex++
        ) {
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

        // 3c. Finish and Save Chapter to DB
        const { currentChapterContent } = storeApi.getState();

        // Save to DB immediately after each chapter
        await saveChapterAction(
          savedBookId,
          chapterNum,
          chapterTitle,
          currentChapterContent,
        );

        // Update local store
        actions.finishChapter(chapterTitle, currentChapterContent);

        const { streamingContent } = storeApi.getState();
        actions.setContent(streamingContent);

        actions.updateGenerationProgress({
          currentChapter: chapterNum + 1,
          currentSection: 0,
          totalSections: 0,
          currentOutline: undefined,
        });
      }

      // 4. Finalize Book
      actions.completeGeneration();
      await updateBookAction(savedBookId, {
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

      if (savedBookId && !abortRef.current?.signal.aborted) {
        await updateBookAction(savedBookId, {
          status: "failed",
        });
      }
    } finally {
      setIsProcessing(false);
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

  const isCompleted = generationProgress.phase === "completed";
  const isResumable = bookStatus === "generating" || bookStatus === "failed";

  if (isCompleted) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-black mb-4 tracking-tight">
            BOOK GENERATED
          </h1>
          <p className="text-neutral-500 font-medium mb-8">
            “{bookTitle || "Untitled Book"}” has been successfully created.
          </p>
          <a
            href={`/book/${savedBookId}`}
            className="inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold h-14 px-8 rounded-full text-lg transition-colors"
          >
            VIEW BOOK
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  if (isActuallyGenerating) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <GenerationStep />
        <StatusOverviewGeneration
          onCancel={handleCancel}
          isGenerating={isActuallyGenerating}
        />
        {generationProgress.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
            {generationProgress.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-4 tracking-tight">
          {bookTitle || "Untitled Book"}
        </h1>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
            Table of Contents
          </h3>
        </div>
        <div className="space-y-2">
          {tableOfContents.map((chapter, idx) => {
            const isFinished = chapters.some(
              (c) => c.chapterNumber === idx + 1,
            );
            return (
              <div
                key={idx}
                className={`flex items-baseline gap-4 text-base p-3 rounded-lg transition-colors ${
                  isFinished ? "bg-green-50" : "hover:bg-neutral-50"
                }`}
              >
                <span
                  className={`font-mono text-sm font-bold w-8 text-right ${
                    isFinished ? "text-green-600" : "text-neutral-400"
                  }`}
                >
                  {isFinished ? "✓" : `${String(idx + 1).padStart(2, "0")}.`}
                </span>
                <span
                  className={`font-bold ${
                    isFinished ? "text-green-800" : "text-black"
                  }`}
                >
                  {chapter}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={handleStart}
          disabled={isProcessing}
          className={`w-full h-16 text-lg font-bold rounded-full ${
            isResumable ? "bg-black hover:bg-neutral-800 text-white" : ""
          }`}
        >
          {isDeductingCredits
            ? "DEDUCTING CREDITS..."
            : isProcessing
            ? "PROCESSING..."
            : isResumable
            ? "RESUME GENERATION"
            : "START GENERATION"}
        </Button>
      </div>

      {generationProgress.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-center">
          {generationProgress.error}
        </div>
      )}
    </div>
  );
}
