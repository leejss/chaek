"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  generationActions,
  generationStore,
  useGenerationStore,
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
import type { PlanOutput } from "@/lib/ai/schemas/plan";

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
  bookPlan?: PlanOutput;
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
    bookPlan,
    bookId,
  } = props;

  const actions = generationActions;
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  );
  const abortRef = useRef<AbortController | null>(null);
  const [isDeductingCredits, setIsDeductingCredits] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const draftChunkBufferRef = useRef<string[]>([]);
  const draftFlushRafRef = useRef<number | null>(null);
  const initialDataRef = useRef({ bookPlan, chapters });

  useEffect(() => {
    const { bookPlan: initialPlan, chapters: initialChapters } =
      initialDataRef.current;
    actions.init(initialPlan, initialChapters);
    return () => {
      actions.reset();
    };
  }, [actions]);

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
    actions.updateProgress({ error: null });
  }, [actions]);

  const handleSectionChunk = useCallback(
    (chunk: string) => {
      if (abortRef.current?.signal.aborted) return;
      draftChunkBufferRef.current.push(chunk);
      scheduleDraftFlush();
    },
    [scheduleDraftFlush],
  );

  const ensureNotCancelled = useCallback(() => {
    if (abortRef.current?.signal.aborted) {
      throw new Error(CANCELLED_MESSAGE);
    }
  }, []);

  const prepareGeneration = useCallback(
    async (args: { totalChapters: number; startChapterNum: number }) => {
      if (chapters.length === 0) {
        setIsDeductingCredits(true);
        await deductCreditsAction(bookId);
        setIsDeductingCredits(false);

        actions.startGeneration(args.totalChapters);
        return;
      }

      const existingContent = chapters.map((c) => c.content).join("\n\n");
      if (existingContent) {
        actions.appendDraftChunk(existingContent);
      }

      actions.updateProgress({
        phase: "planning",
        totalChapters: args.totalChapters,
        currentChapter: args.startChapterNum,
      });
    },
    [actions, bookId, chapters],
  );

  const ensureBookPlan = useCallback(
    async (args: {
      settings: BookSettings;
      model: BookGenerationSettings["model"];
    }) => {
      let currentPlan = generationStore.getState().bookPlan;
      if (currentPlan) return currentPlan;

      actions.updateProgress({ phase: "planning" });
      ensureNotCancelled();
      currentPlan = await generatePlanAction({
        bookId,
        sourceText: sourceText || "",
        toc: tableOfContents,
        provider: generationSettings.provider,
        model: args.model,
        settings: args.settings,
      });
      actions.init(currentPlan, chapters);
      return currentPlan;
    },
    [
      actions,
      bookId,
      chapters,
      ensureNotCancelled,
      generationSettings.provider,
      sourceText,
      tableOfContents,
    ],
  );

  const generateSingleChapter = useCallback(
    async (args: {
      chapterNum: number;
      bookPlan: PlanOutput;
      settings: BookSettings;
      model: BookGenerationSettings["model"];
    }) => {
      const { chapterNum, bookPlan, settings, model } = args;
      ensureNotCancelled();

      actions.updateProgress({
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
        bookId,
        toc: tableOfContents,
        chapterNumber: chapterNum,
        sourceText,
        bookPlan,
        provider: generationSettings.provider,
        model,
        settings,
      });

      flushDraft();
      const chapterHeader = `\n\n## ${chapterTitle}\n\n`;
      actions.appendDraftChunk(chapterHeader);

      actions.updateProgress({
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

        actions.updateProgress({
          currentSection: sectionIndex,
        });

        const previousSections = chapterOutline.sections
          .slice(0, sectionIndex)
          .map((s: Section) => ({ title: s.title, summary: s.summary }));

        flushDraft();
        const { currentChapterContent } = generationStore.getState();

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

        actions.updateProgress({
          currentSection: sectionIndex + 1,
        });
      }

      flushDraft();
      const { currentChapterContent } = generationStore.getState();

      await saveChapterAction(
        bookId,
        chapterNum,
        chapterTitle,
        currentChapterContent,
        chapterOutline,
      );

      actions.finishChapter(chapterTitle, currentChapterContent);

      actions.updateProgress({
        currentChapter: chapterNum + 1,
        currentSection: 0,
        totalSections: 0,
        currentOutline: undefined,
      });
    },
    [
      actions,
      bookId,
      ensureNotCancelled,
      flushDraft,
      generationSettings.provider,
      handleSectionChunk,
      sourceText,
      tableOfContents,
    ],
  );

  const finalizeBook = useCallback(
    async (totalChapters: number) => {
      actions.complete();
      flushDraft();
      const completedChapters = generationStore.getState().chapters;
      const content = completedChapters.map((c) => c.content).join("\n\n");
      await updateBookAction(bookId, {
        status: "completed",
        content,
      });

      actions.updateProgress({
        phase: "completed",
        currentChapter: totalChapters,
      });
    },
    [actions, bookId, flushDraft],
  );

  const handleGenerationError = useCallback(
    async (err: unknown) => {
      const isCancelled =
        abortRef.current?.signal.aborted ||
        (err instanceof Error && err.message === CANCELLED_MESSAGE);

      if (isCancelled) {
        flushDraft();
        actions.updateProgress({
          phase: "idle",
          error: null,
        });
        actions.cancel();
        return;
      }

      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      actions.updateProgress({
        phase: "error",
        error: message,
      });
      actions.fail(message);

      if (bookId && !abortRef.current?.signal.aborted) {
        await updateBookAction(bookId, {
          status: "failed",
        });
      }
    },
    [actions, bookId, flushDraft],
  );

  const handleStart = async () => {
    if (isProcessing) return;

    abortRef.current = new AbortController();
    setIsProcessing(true);
    clearError();

    try {
      const model = generationSettings.model;

      const settings: BookSettings = {
        language: generationSettings.language,
        chapterCount: generationSettings.chapterCount,
        userPreference: generationSettings.userPreference,
      };

      const totalChapters = tableOfContents.length;
      const startChapterNum = getNextChapterNumber({
        totalChapters,
        chapters,
      });

      await prepareGeneration({ totalChapters, startChapterNum });
      const bookPlan = await ensureBookPlan({ settings, model });

      for (let chapterNum = startChapterNum; chapterNum <= totalChapters; ) {
        await generateSingleChapter({
          chapterNum,
          bookPlan,
          settings,
          model,
        });
        chapterNum++;
      }

      await finalizeBook(totalChapters);
    } catch (err) {
      await handleGenerationError(err);
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
