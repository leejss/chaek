"use client";

import { useEffect, useState } from "react";
import { useBookStore } from "@/lib/book/bookContext";
import { useSettingsStore } from "@/lib/book/settingsStore";
import { useBookStreaming } from "@/lib/hooks/useBookStreaming";
import { authFetch } from "@/lib/api";
import { Book, GeminiModel, ClaudeModel } from "@/lib/book/types";
import GenerationStep from "../../_components/GenerationStep";
import Button from "../../../_components/Button";
import StatusOverview from "../../_components/StatusOverview";
import { Play } from "lucide-react";

interface GenerationViewProps {
  initialBook: Book;
}

export default function GenerationView({ initialBook }: GenerationViewProps) {
  const store = useBookStore();
  const settings = useSettingsStore();
  const { generate, isGenerating, error } = useBookStreaming();

  const [isDeductingCredits, setIsDeductingCredits] = useState(false);

  useEffect(() => {
    store.actions.initializeFromBook(initialBook);
  }, [initialBook, store.actions]);

  const handleStart = async () => {
    const {
      tableOfContents,
      sourceText,
      bookTitle,
      actions: { setupGeneration },
    } = store;

    if (!tableOfContents.length) {
      alert("차례가 없습니다.");
      return;
    }

    if (isDeductingCredits) return;

    setIsDeductingCredits(true);

    try {
      const deductRes = await authFetch(`/api/books/${initialBook.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle || "Untitled Book",
          tableOfContents,
          sourceText: sourceText || "",
          provider: store.aiConfiguration.content.provider,
          model: store.aiConfiguration.content.model,
          language: settings.language,
          userPreference: settings.userPreference,
        }),
      });

      const deductJson = await deductRes.json();
      if (!deductRes.ok) {
        throw new Error(deductJson.error || "크레딧 차감에 실패했습니다.");
      }

      setupGeneration(initialBook.id);

      generate({
        bookId: initialBook.id,
        provider: store.aiConfiguration.content.provider,
        model: store.aiConfiguration.content.model as GeminiModel | ClaudeModel,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      alert(`오류: ${message}`);
      setIsDeductingCredits(false);
    }
  };

  const isActuallyGenerating =
    isGenerating || (store.generationProgress.phase !== "idle");

  if (isActuallyGenerating) {
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <GenerationStep />
        <StatusOverview />
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
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
            {settings.language} • {settings.requireConfirm ? "Review Each" : "Auto-Generate"}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">챕터 수</span>
            <span className="font-medium">{initialBook.tableOfContents.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">AI 모델</span>
            <span className="font-medium">
              {store.aiConfiguration.content.provider} / {store.aiConfiguration.content.model}
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

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
