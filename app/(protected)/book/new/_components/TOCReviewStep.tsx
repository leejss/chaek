"use client";

import { Check, Edit2, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";
import { setBookField, useBookCreationStore } from "@/context/bookCreationStore";
import { createBookAction } from "@/lib/actions/book";
import { clearBookCreationDraft } from "@/lib/bookCreationDraft";
import { useTocGeneration } from "@/lib/hooks/useTocGeneration";

/**
 * Pure functions for TOC manipulation (FP Domain Logic)
 */
const TOC = {
  add: (toc: string[]) => [...toc, ""],
  remove: (toc: string[], index: number) => toc.filter((_, i) => i !== index),
  update: (toc: string[], index: number, value: string) =>
    toc.map((t, i) => (i === index ? value : t)),
  normalize: (toc: string[]) => toc.map((t) => t.trim()).filter(Boolean),
  formatTitle: (title: string) => title.trim() || "Untitled Book",
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
    <div className="mx-auto max-w-3xl py-12 text-black">
      <div className="space-y-10">
        <div className="space-y-4 text-center">
          <h1 className="font-extrabold text-4xl text-black">Review Structure</h1>
          <p className="mx-auto max-w-md font-medium text-neutral-500">
            Review and refine the book structure. You can edit chapter titles or regenerate the
            entire outline.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="overflow-hidden rounded-xl border-2 border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-neutral-200 border-b-2 bg-white p-6">
            <h2 className="font-bold text-black">Chapters Outline</h2>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-8 px-4 font-bold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    className="h-8 gap-2 px-4 font-bold text-xs"
                  >
                    <Check size={14} strokeWidth={3} />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleEditStart}
                  className="h-8 gap-2 rounded-full border-neutral-300 bg-white px-4 font-bold text-black text-sm hover:bg-neutral-50"
                >
                  <Edit2 size={12} strokeWidth={3} />
                  Edit Outline
                </Button>
              )}
            </div>
          </div>

          <div className="p-8 md:p-10">
            {isEditing ? (
              <div className="space-y-8">
                <div className="border-neutral-200 border-b pb-6">
                  <label className="mb-3 block font-bold text-black text-xs uppercase tracking-widest">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="ENTER BOOK TITLE..."
                    className="w-full border-neutral-200 border-b-2 bg-transparent py-2 font-bold text-2xl text-black transition-colors placeholder:text-neutral-300 focus:border-black focus:outline-none"
                  />
                </div>
                <div className="space-y-4">
                  {tempTOC.map((chapter, idx) => (
                    <div key={idx} className="group flex items-center gap-4">
                      <span className="w-6 font-bold text-neutral-400">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => updateChapter(idx, e.target.value)}
                        placeholder={`CHAPTER ${idx + 1} TITLE...`}
                        className="flex-1 border-neutral-200 border-b bg-transparent py-2 font-medium text-black text-lg transition-colors placeholder:text-neutral-300 focus:border-black focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeChapter(idx)}
                        className="p-2 text-neutral-400 opacity-0 transition-colors hover:text-red-600 group-hover:opacity-100"
                        title="Remove chapter"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addChapter}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 border-dashed py-4 font-bold text-neutral-500 text-xs uppercase tracking-widest transition-all hover:border-black hover:text-black"
                  >
                    <Plus size={16} strokeWidth={3} />
                    Add Chapter
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="border-neutral-200 border-b pb-6 text-center">
                  <h2 className="font-extrabold text-3xl text-black tracking-tight">
                    {bookTitle || "Untitled Book"}
                  </h2>
                </div>
                {tableOfContents?.length > 0 ? (
                  <div className="space-y-6">
                    {tableOfContents.map((chapter, idx) => (
                      <div key={idx} className="group flex items-baseline gap-5">
                        <span className="font-bold font-mono text-neutral-400 text-sm">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-bold text-black text-lg leading-relaxed">
                          {chapter}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center font-medium text-neutral-400 italic">
                    No chapters generated yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Section */}
        {!isEditing && (
          <div className="space-y-8">
            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
                {saveError}
              </div>
            )}
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row md:w-auto">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="h-12 w-full gap-2 rounded-full border-2 border-neutral-200 bg-white px-6 font-bold text-black hover:border-black hover:bg-white sm:w-auto"
              >
                <RefreshCw
                  size={14}
                  strokeWidth={3}
                  className={isRegenerating ? "animate-spin" : ""}
                />
                Regenerate
              </Button>
              <Button
                variant="primary"
                onClick={handleStartWriting}
                disabled={isRegenerating || isSaving || tableOfContents.length === 0}
                className="h-12 w-full gap-2 rounded-full px-8 font-bold shadow-none sm:w-auto"
              >
                <FileText size={14} strokeWidth={3} />
                {isSaving ? "Saving" : "Start"}
              </Button>
            </div>
            <p className="text-center font-bold text-[11px] text-neutral-400 uppercase tracking-wide">
              Click <span className="text-black">Start</span> to begin generating the full content
              for each chapter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
