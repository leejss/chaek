"use client";

import { useRef, useState, useCallback } from "react";
import {
  useGenerationStore,
  useGenerationStoreApi,
} from "@/lib/book/generationContext";
import { BookSettings } from "@/lib/book/settings";
import { BookGenerationSettings } from "@/lib/book/settings";
import { Section } from "@/lib/book/types";
import { fetchStreamSection } from "@/lib/ai/fetch";
import { cn } from "@/utils";
import { deductCreditsAction } from "@/lib/actions/credits";
import { generatePlanAction, generateOutlineAction } from "@/lib/actions/ai";
import { updateBookAction, saveChapterAction } from "@/lib/actions/book";
import GenerationStep from "../../_components/GenerationStep";
import StatusOverviewGeneration from "../../_components/StatusOverviewGeneration";
import Button from "../../../_components/Button";

const CANCELLED_MESSAGE = "생성이 취소되었습니다.";

function getNextChapterNumber(args: {
  totalChapters: number;
  chapters: { chapterNumber: number; isComplete: boolean }[];
}): number {
  const completed = new Set(
    args.chapters.filter((c) => c.isComplete).map((c) => c.chapterNumber),
  );

  for (let chapterNum = 1; chapterNum <= args.totalChapters; chapterNum++) {
    if (!completed.has(chapterNum)) return chapterNum;
  }

  return args.totalChapters + 1;
}

export interface GenerationViewProps {
  bookTitle: string;
  bookStatus: "waiting" | "generating" | "completed" | "failed";
  tableOfContents: string[];
  sourceText: string;
  chapters: {
    chapterNumber: number;
    chapterTitle: string;
    content: string;
    isComplete: boolean;
  }[];
  generationSettings: BookGenerationSettings;
  savedBookId: string;
}

export default function GenerationView(props: GenerationViewProps) {
  const {
    bookTitle,
    bookStatus,
    tableOfContents,
    sourceText,
    chapters,
    generationSettings,
    savedBookId,
  } = props;

  const storeApi = useGenerationStoreApi();
  const actions = useGenerationStore((state) => state.actions);
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  );
  const abortRef = useRef<AbortController | null>(null);
  const [isDeductingCredits, setIsDeductingCredits] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const draftChunkBufferRef = useRef<string[]>([]);
  const draftFlushRafRef = useRef<number | null>(null);

  const flushDraft = useCallback(() => {
    if (draftFlushRafRef.current != null) {
      cancelAnimationFrame(draftFlushRafRef.current);
      draftFlushRafRef.current = null;
    }
    const buffered = draftChunkBufferRef.current;
    if (buffered.length === 0) return;

    const delta = buffered.join("");
    draftChunkBufferRef.current = [];
    actions.appendDraftChunk(delta);
  }, [actions]);

  const scheduleDraftFlush = useCallback(() => {
    if (draftFlushRafRef.current != null) return;
    draftFlushRafRef.current = requestAnimationFrame(() => {
      draftFlushRafRef.current = null;
      flushDraft();
    });
  }, [flushDraft]);

  const clearError = useCallback(() => {
    actions.updateGenerationProgress({ error: null });
  }, [actions]);

  const handleSectionChunk = useCallback(
    (chunk: string) => {
      if (abortRef.current?.signal.aborted) return;
      draftChunkBufferRef.current.push(chunk);
      scheduleDraftFlush();
    },
    [scheduleDraftFlush],
  );

  const handleStart = async () => {
    if (isProcessing) return;

    abortRef.current = new AbortController();
    setIsProcessing(true);
    clearError();

    try {
      const ensureNotCancelled = () => {
        if (abortRef.current?.signal.aborted) {
          throw new Error(CANCELLED_MESSAGE);
        }
      };

      const totalChapters = tableOfContents.length;
      const model = generationSettings.model;

      const settings: BookSettings = {
        language: generationSettings.language,
        chapterCount: generationSettings.chapterCount,
        userPreference: generationSettings.userPreference,
      };

      const startChapterNum = getNextChapterNumber({
        totalChapters,
        chapters,
      });

      const prepareGeneration = async () => {
        if (chapters.length === 0) {
          setIsDeductingCredits(true);
          await deductCreditsAction(savedBookId);
          setIsDeductingCredits(false);

          actions.setupGeneration(totalChapters);
          return;
        }

        const { streamingContent } = storeApi.getState();
        if (!streamingContent && chapters.length > 0) {
          actions.updateDraft({
            streamingContent: chapters.map((c) => c.content).join("\n\n"),
            currentChapterContent: "",
          });
        }

        actions.updateGenerationProgress({
          phase: "planning",
          totalChapters,
          currentChapter: startChapterNum,
        });
      };

      const ensureBookPlan = async () => {
        let bookPlan = storeApi.getState().bookPlan;
        if (bookPlan) return bookPlan;

        actions.updateGenerationProgress({ phase: "planning" });
        ensureNotCancelled();
        bookPlan = await generatePlanAction({
          bookId: savedBookId,
          sourceText: sourceText || "",
          toc: tableOfContents,
          provider: generationSettings.provider,
          model,
          settings,
        });
        actions.setBookPlan(bookPlan);
        return bookPlan;
      };

      const generateSingleChapter = async (args: {
        chapterNum: number;
        bookPlan: Awaited<ReturnType<typeof ensureBookPlan>>;
      }) => {
        const { chapterNum, bookPlan } = args;
        ensureNotCancelled();

        actions.updateGenerationProgress({
          phase: "outlining",
          currentChapter: chapterNum,
          currentSection: 0,
          currentOutline: undefined,
        });

        const chapterTitle = tableOfContents[chapterNum - 1];
        ensureNotCancelled();

        const chapterOutline = await generateOutlineAction({
          bookId: savedBookId,
          toc: tableOfContents,
          chapterNumber: chapterNum,
          sourceText,
          bookPlan,
          provider: generationSettings.provider,
          model,
          settings,
        });

        {
          flushDraft();
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

        for (
          let sectionIndex = 0;
          sectionIndex < chapterOutline.sections.length;
          sectionIndex++
        ) {
          ensureNotCancelled();

          actions.updateGenerationProgress({
            currentSection: sectionIndex,
          });

          const previousSections = chapterOutline.sections
            .slice(0, sectionIndex)
            .map((s: Section) => ({ title: s.title, summary: s.summary }));

          flushDraft();
          const { currentChapterContent } = storeApi.getState();

          if (
            currentChapterContent.length > 0 &&
            !currentChapterContent.endsWith("\n")
          ) {
            actions.appendDraftChunk("\n");
          }

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
            model,
            settings,
            signal: abortRef.current?.signal,
          })) {
            handleSectionChunk(chunk);
          }

          flushDraft();

          actions.updateGenerationProgress({
            currentSection: sectionIndex + 1,
          });
        }

        flushDraft();
        const { currentChapterContent } = storeApi.getState();

        await saveChapterAction(
          savedBookId,
          chapterNum,
          chapterTitle,
          currentChapterContent,
          chapterOutline,
        );

        actions.finishChapter(chapterTitle, currentChapterContent);

        actions.updateGenerationProgress({
          currentChapter: chapterNum + 1,
          currentSection: 0,
          totalSections: 0,
          currentOutline: undefined,
        });
      };

      const finalizeBook = async () => {
        actions.completeGeneration();
        flushDraft();
        const { streamingContent } = storeApi.getState();
        await updateBookAction(savedBookId, {
          status: "completed",
          content: streamingContent,
        });

        actions.updateGenerationProgress({
          phase: "completed",
          currentChapter: totalChapters,
        });
      };

      await prepareGeneration();
      const bookPlan = await ensureBookPlan();

      for (let chapterNum = startChapterNum; chapterNum <= totalChapters; ) {
        await generateSingleChapter({ chapterNum, bookPlan });
        chapterNum++;
      }

      await finalizeBook();
    } catch (err) {
      const isCancelled =
        abortRef.current?.signal.aborted ||
        (err instanceof Error && err.message === CANCELLED_MESSAGE);

      if (isCancelled) {
        flushDraft();
        actions.updateGenerationProgress({
          phase: "idle",
          error: null,
        });
        actions.cancelGeneration();
        return;
      }

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

      if (draftFlushRafRef.current != null) {
        cancelAnimationFrame(draftFlushRafRef.current);
        draftFlushRafRef.current = null;
      }
      draftChunkBufferRef.current = [];
    }
  };

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    flushDraft();
  }, [flushDraft]);

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
        <GenerationStep tableOfContents={tableOfContents} />
        <StatusOverviewGeneration
          bookTitle={bookTitle}
          sourceText={sourceText}
          tableOfContents={tableOfContents}
          generationSettings={generationSettings}
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
                className={cn(
                  "flex items-baseline gap-4 text-base p-3 rounded-lg transition-colors",
                  isFinished ? "bg-green-50" : "hover:bg-neutral-50",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-sm font-bold w-8 text-right",
                    isFinished ? "text-green-600" : "text-neutral-400",
                  )}
                >
                  {isFinished ? "✓" : `${String(idx + 1).padStart(2, "0")}.`}
                </span>
                <span
                  className={cn(
                    "font-bold",
                    isFinished ? "text-green-800" : "text-black",
                  )}
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
          className={cn(
            "w-full h-16 text-lg font-bold rounded-full",
            isResumable && "bg-black hover:bg-neutral-800 text-white",
          )}
        >
          {isDeductingCredits
            ? "PROCESSING..."
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
