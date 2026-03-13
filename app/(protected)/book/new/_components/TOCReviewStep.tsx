"use client";

import { Check, Edit2, FileText, Plus, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";
import { setBookField, useBookCreationStore } from "@/context/bookCreationStore";
import { createBookAction } from "@/lib/actions/book";
import { clearBookCreationDraft } from "@/lib/bookCreationDraft";
import { useTocGeneration } from "@/lib/hooks/useTocGeneration";
import { cn } from "@/utils";

/**
 * Pure functions for TOC manipulation (FP Domain Logic)
 */
const TOC = {
  add: (toc: string[]) => [...toc, ""],
  remove: (toc: string[], index: number) => toc.filter((_, i) => i !== index),
  update: (toc: string[], index: number, value: string) =>
    toc.map((t, i) => (i === index ? value : t)),
  normalize: (toc: string[]) => toc.map((t) => t.trim()).filter(Boolean),
  formatTitle: (title: string) => title.trim() || "제목 없는 책",
};

export default function TOCReviewStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const tableOfContents = useBookCreationStore((s) => s.tableOfContents);
  const bookTitle = useBookCreationStore((s) => s.bookTitle);
  const sourceText = useBookCreationStore((s) => s.sourceText);
  const tocGeneration = useBookCreationStore((s) => s.tocGeneration);
  const contentProvider = useBookCreationStore((s) => s.contentProvider);
  const contentModel = useBookCreationStore((s) => s.contentModel);
  const language = useBookCreationStore((s) => s.language);
  const chapterCount = useBookCreationStore((s) => s.chapterCount);
  const userPreference = useBookCreationStore((s) => s.userPreference);
  const { generate } = useTocGeneration();

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isRegenerating =
    tocGeneration.status === "loading" && tocGeneration.variant === "regenerate";

  const handleEditStart = () => {
    setTempTitle(bookTitle);
    setTempTOC([...tableOfContents]);
    setIsEditing(true);
  };

  const handleSave = () => {
    const normalized = TOC.normalize(tempTOC);
    if (normalized.length === 0) return;
    setBookField("bookTitle", TOC.formatTitle(tempTitle));
    setBookField("tableOfContents", normalized);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const addChapter = () => {
    setTempTOC(TOC.add);
  };

  const removeChapter = (index: number) => {
    setTempTOC((prev) => TOC.remove(prev, index));
  };

  const updateChapter = (index: number, value: string) => {
    setTempTOC((prev) => TOC.update(prev, index, value));
  };

  const handleStartWriting = async () => {
    if (isSaving) return;

    setSaveError(null);
    setIsSaving(true);
    try {
      const { bookId } = await createBookAction(bookTitle, tableOfContents, sourceText, {
        provider: contentProvider,
        model: contentModel,
        language,
        chapterCount,
        userPreference,
      });
      if (draftId) {
        clearBookCreationDraft(draftId);
      }
      router.push(`/book/new/${bookId}`);
    } catch (err) {
      console.error("Book creation failed:", err);
      setSaveError("책 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (isRegenerating) return;
    await generate("regenerate");
  };

  return (
    <div className="space-y-32">
      <div className="space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">구성 검토</h2>
        <p className="text-neutral-500">
          생성된 책의 구조를 검토합니다. 제목과 목차를 편집하거나 처음부터 다시 생성할 수 있습니다.
        </p>
      </div>

      <div className="space-y-16">
        <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400">목차 개요</h2>
          <div className="flex items-center gap-4">
            {isEditing ? (
              <>
                <button type="button" onClick={handleCancel} className="text-xs tracking-wide text-neutral-400 hover:text-neutral-900 font-semibold transition-colors">
                  취소
                </button>
                <button type="button" onClick={handleSave} className="text-xs tracking-wide text-neutral-900 hover:text-neutral-600 font-semibold transition-colors flex items-center gap-1">
                  저장
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEditStart}
                className="text-xs tracking-wide text-neutral-400 hover:text-neutral-900 font-semibold transition-colors flex items-center gap-1"
              >
                편집하기
              </button>
            )}
          </div>
        </div>

        <div className="bg-white">
          {isEditing ? (
            <div className="space-y-16">
              <div className="space-y-4">
                <label className="block text-xs font-semibold tracking-wide text-neutral-400">책 제목</label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="제목을 입력해 주세요..."
                  className="w-full bg-transparent py-2 border-0 border-b border-neutral-200 text-3xl font-semibold tracking-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-0"
                />
              </div>
              <div className="space-y-6">
                {tempTOC.map((chapter, idx) => (
                  <div key={idx} className="group flex items-start gap-6">
                    <span className="w-8 shrink-0 text-left font-medium text-neutral-400 pt-1.5">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="text"
                      value={chapter}
                      onChange={(e) => updateChapter(idx, e.target.value)}
                      placeholder={`${idx + 1}장 제목 입력...`}
                      className="flex-1 bg-transparent py-1 border-0 border-b border-neutral-200 text-xl font-medium text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-0 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeChapter(idx)}
                      className="text-neutral-300 hover:text-red-500 transition-colors pt-2"
                      title="챕터 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addChapter}
                  className="mt-8 flex items-center gap-2 text-xs tracking-wide font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Plus size={12} />
                  챕터 추가
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-16">
              <div className="space-y-4">
                <h2 className="text-xs font-semibold tracking-wide text-neutral-400">책 제목</h2>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                  {bookTitle || "제목 없는 책"}
                </h1>
              </div>
              {tableOfContents?.length > 0 ? (
                <div className="space-y-6">
                  {tableOfContents.map((chapter, idx) => (
                    <div key={idx} className="flex gap-6 items-start">
                      <span className="w-8 shrink-0 text-left font-medium text-neutral-400 pt-0.5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xl font-medium text-neutral-900 leading-relaxed">{chapter}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-neutral-400 py-12">
                  아직 목차가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="pt-24">
            {saveError && (
              <div className="mb-8 font-medium text-sm text-red-500">
                {saveError}
              </div>
            )}
            
            <div className="flex flex-col gap-8 md:flex-row md:items-end justify-between border-t border-neutral-100 pt-10">
              <button
                 type="button"
                 onClick={handleRegenerate}
                 disabled={isRegenerating}
                 className="flex items-center text-xs font-semibold tracking-wide text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={cn("mr-2", isRegenerating && "animate-spin")} />
                목차 다시 생성하기
              </button>

              <Button
                variant="ghost"
                onClick={handleStartWriting}
                disabled={isRegenerating || isSaving || tableOfContents.length === 0}
                className="group px-0 h-auto py-2 text-sm tracking-wide font-semibold text-neutral-900 hover:bg-transparent hover:text-neutral-600 disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "작성 시작하기"}
                {!isSaving && <ArrowRight size={14} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
