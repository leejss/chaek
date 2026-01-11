"use client";

import { useRef, useState, useCallback } from "react";
import {
  useGenerationStore,
  useGenerationStoreApi,
} from "@/context/generationContext";
import { BookSettings, BookGenerationSettings } from "@/context/types/settings";
import { Section } from "@/context/types/book";
import { fetchStreamSection } from "@/lib/ai/fetch";
import { deductCreditsAction } from "@/lib/actions/credits";
import { generatePlanAction, generateOutlineAction } from "@/lib/actions/ai";
import { updateBookAction, saveChapterAction } from "@/lib/actions/book";
import CompletedView from "./CompletedView";
import GeneratingView from "./GeneratingView";
import IdleView from "./IdleView";

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
  bookId: string;
}

export default function GenerationView(props: GenerationViewProps) {
  const {
    bookTitle,
    bookStatus,
    tableOfContents,
    sourceText,
    chapters,
    generationSettings,
    bookId,
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
          await deductCreditsAction(bookId);
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
          bookId: bookId,
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
        if (!chapterTitle) {
          throw new Error("Invalid chapter title");
        }
        ensureNotCancelled();

        const chapterOutline = await generateOutlineAction({
          bookId: bookId,
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
          bookId,
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
        await updateBookAction(bookId, {
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

      if (bookId && !abortRef.current?.signal.aborted) {
        await updateBookAction(bookId, {
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
    return <CompletedView bookTitle={bookTitle} bookId={bookId} />;
  }

  if (isActuallyGenerating) {
    return (
      <GeneratingView
        bookTitle={bookTitle}
        sourceText={sourceText}
        tableOfContents={tableOfContents}
        generationSettings={generationSettings}
        onCancel={handleCancel}
        isGenerating={isActuallyGenerating}
        error={generationProgress.error}
      />
    );
  }

  return (
    <IdleView
      bookTitle={bookTitle}
      tableOfContents={tableOfContents}
      chapters={chapters}
      isProcessing={isProcessing}
      isDeductingCredits={isDeductingCredits}
      isResumable={isResumable}
      error={generationProgress.error}
      onStart={handleStart}
    />
  );
}
