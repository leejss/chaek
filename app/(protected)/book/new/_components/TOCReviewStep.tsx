"use client";

import { Check, Edit2, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
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
    <div className="space-y-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">구성 검토</h1>
        <p className="text-sm text-neutral-500">
          책 구성을 검토하고 다듬어 보세요. 챕터 제목을 수정하거나 전체 목차를 다시 생성할 수
          있습니다.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">챕터 개요</h2>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={handleCancel} className="h-8 px-3 text-xs">
                  취소
                </Button>
                <Button variant="primary" onClick={handleSave} className="h-8 px-3 text-xs gap-1.5">
                  <Check size={14} />
                  저장
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleEditStart}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <Edit2 size={12} />
                편집
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 bg-white">
          <div className="p-6 md:p-8">
            {isEditing ? (
              <div className="space-y-8">
                <div className="border-b border-neutral-100 pb-6">
                  <label className="mb-2 block text-xs font-medium text-neutral-500">책 제목</label>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="책 제목을 입력해 주세요..."
                    className="w-full bg-transparent py-1 text-xl font-medium text-foreground placeholder:text-neutral-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  {tempTOC.map((chapter, idx) => (
                    <div key={idx} className="group flex items-center gap-3">
                      <span className="w-6 text-sm text-neutral-400">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => updateChapter(idx, e.target.value)}
                        placeholder={`${idx + 1}장 제목을 입력해 주세요...`}
                        className="flex-1 bg-transparent py-1.5 text-base text-foreground placeholder:text-neutral-300 focus:outline-none focus:border-b focus:border-neutral-300 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removeChapter(idx)}
                        className="p-1.5 text-neutral-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        title="챕터 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addChapter}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-200 py-3 text-sm text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-foreground"
                  >
                    <Plus size={14} />
                    챕터 추가
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="border-b border-neutral-100 pb-6">
                  <h2 className="text-xl font-medium text-foreground">
                    {bookTitle || "제목 없는 책"}
                  </h2>
                </div>
                {tableOfContents?.length > 0 ? (
                  <div className="space-y-5">
                    {tableOfContents.map((chapter, idx) => (
                      <div key={idx} className="flex gap-4">
                        <span className="font-mono text-sm text-neutral-400 pt-0.5">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-base text-foreground leading-relaxed">{chapter}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-neutral-400">
                    아직 생성된 챕터가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-6 pt-4 border-t border-neutral-100">
            {saveError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {saveError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-neutral-500">
                시작을 누르면 각 챕터의 전체 본문 생성을 시작합니다.
              </p>
              <div className="flex w-full sm:w-auto items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="w-full sm:w-auto px-6"
                >
                  <RefreshCw size={14} className={cn("mr-2", isRegenerating && "animate-spin")} />
                  다시 생성
                </Button>
                <Button
                  variant="primary"
                  onClick={handleStartWriting}
                  disabled={isRegenerating || isSaving || tableOfContents.length === 0}
                  className="w-full sm:w-auto px-8"
                >
                  {isSaving ? "저장 중..." : "시작"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
