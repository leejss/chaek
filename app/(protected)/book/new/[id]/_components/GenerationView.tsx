"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useBookStore } from "@/lib/book/bookContext";
import { useSettingsStore } from "@/lib/book/settingsStore";
import {
  Book,
  GeminiModel,
  ClaudeModel,
  ChapterOutline,
  Section,
} from "@/lib/book/types";
import { fetchPlan, fetchOutline, fetchStreamSection } from "@/lib/ai/fetch";
import { fetchDeductCredits } from "@/lib/db/fetch";
import { PlanOutput } from "@/lib/ai/specs/plan";
import GenerationStep from "../../_components/GenerationStep";
import Button from "../../../_components/Button";
import StatusOverview from "../../_components/StatusOverview";
import { Play } from "lucide-react";

interface GenerationViewProps {
  initialBook: Book;
}

type GenerationPhase =
  | "idle"
  | "deducting_credits"
  | "planning"
  | "outlining"
  | "generating_sections"
  | "completed"
  | "error";

interface GenerationState {
  phase: GenerationPhase;
  currentChapter: number;
  totalChapters: number;
  currentSection: number;
  totalSections: number;
  currentOutline: ChapterOutline | null;
  error: string | null;
}

export default function GenerationView({ initialBook }: GenerationViewProps) {
  const store = useBookStore();
  const settings = useSettingsStore();
  const abortRef = useRef<AbortController | null>(null);

  const [isDeductingCredits, setIsDeductingCredits] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
    phase: "idle",
    currentChapter: 0,
    totalChapters: initialBook.tableOfContents.length,
    currentSection: 0,
    totalSections: 0,
    currentOutline: null,
    error: null,
  });

  useEffect(() => {
    store.actions.initializeFromBook(initialBook);
  }, [initialBook, store.actions]);

  const updateProgress = useCallback((updates: Partial<GenerationState>) => {
    setGenerationState((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    updateProgress({ error: null });
  }, [updateProgress]);

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
      // Credit 차감
      await fetchDeductCredits(initialBook.id);

      setupGeneration(initialBook.id);
      setGenerationState((prev) => ({
        ...prev,
        phase: "planning",
        totalChapters: tableOfContents.length,
        currentChapter: 1,
        currentSection: 0,
        totalSections: 0,
      }));

      const planRes = await fetchPlan(
        sourceText || "",
        tableOfContents,
        store.aiConfiguration.content.provider,
        store.aiConfiguration.content.model as GeminiModel | ClaudeModel,
        settings,
      );

      const bookPlan: PlanOutput = planRes.data.plan;
      store.actions.updateDraft({});

      for (
        let chapterNum = 1;
        chapterNum <= tableOfContents.length;
        chapterNum++
      ) {
        if (abortRef.current?.signal.aborted) {
          throw new Error("생성이 취소되었습니다.");
        }

        updateProgress({
          phase: "outlining",
          currentChapter: chapterNum,
          currentSection: 0,
          currentOutline: null,
        });

        const chapterTitle = tableOfContents[chapterNum - 1];
        const outlineRes = await fetchOutline({
          toc: tableOfContents,
          chapterNumber: chapterNum,
          sourceText: sourceText || "",
          bookPlan,
          provider: store.aiConfiguration.content.provider,
          model: store.aiConfiguration.content.model as
            | GeminiModel
            | ClaudeModel,
          settings,
        });

        const chapterOutline = outlineRes.data.outline;
        updateProgress({
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

          updateProgress({ currentSection: sectionIndex });

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

          updateProgress({ currentSection: sectionIndex + 1 });
        }

        const { completeGeneration } = store.actions;
        const { content } = useBookStore.getState();
        completeGeneration(content);

        updateProgress({
          currentChapter: chapterNum + 1,
          currentSection: 0,
          totalSections: 0,
          currentOutline: null,
        });
      }

      setGenerationState((prev) => ({
        ...prev,
        phase: "completed",
        currentChapter: tableOfContents.length,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setGenerationState((prev) => ({
        ...prev,
        phase: "error",
        error: message,
      }));
      store.actions.failGeneration(message);
    } finally {
      setIsDeductingCredits(false);
      abortRef.current = null;
    }
  };

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isActuallyGenerating =
    generationState.phase !== "idle" &&
    generationState.phase !== "error" &&
    generationState.phase !== "completed";

  if (isActuallyGenerating) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <GenerationStep
          phase={generationState.phase}
          currentChapter={generationState.currentChapter}
          totalChapters={generationState.totalChapters}
          currentSection={generationState.currentSection}
          totalSections={generationState.totalSections}
          currentOutline={generationState.currentOutline}
        />
        <StatusOverview
          onCancel={handleCancel}
          isGenerating={isActuallyGenerating}
        />
        {generationState.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {generationState.error}
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
        <p className="text-neutral-600">
          {initialBook.tableOfContents.length}개 챕터가 준비되었습니다.
        </p>
      </div>

      <div className="bg-background border border-neutral-200 rounded-2xl p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">책 생성</h2>
          <span className="text-sm text-neutral-500">
            {settings.language} •{" "}
            {settings.requireConfirm ? "Review Each" : "Auto-Generate"}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">챕터 수</span>
            <span className="font-medium">
              {initialBook.tableOfContents.length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">AI 모델</span>
            <span className="font-medium">
              {store.aiConfiguration.content.provider} /{" "}
              {store.aiConfiguration.content.model}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">출력 언어</span>
            <span className="font-medium">{settings.language}</span>
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={handleStart}
            disabled={isDeductingCredits}
            className="w-full h-12 text-lg gap-2"
          >
            <Play size={18} />
            {isDeductingCredits ? "크레딧 차감 중..." : "책 생성 시작하기"}
          </Button>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-6">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
          차례 (Table of Contents)
        </h3>
        <div className="space-y-2">
          {initialBook.tableOfContents.map((chapter, idx) => (
            <div key={idx} className="flex items-baseline gap-3 text-sm">
              <span className="font-bold text-neutral-400 w-5">{idx + 1}.</span>
              <span className="text-foreground">{chapter}</span>
            </div>
          ))}
        </div>
      </div>

      {generationState.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {generationState.error}
        </div>
      )}
    </div>
  );
}
