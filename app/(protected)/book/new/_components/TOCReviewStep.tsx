"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AI_CONFIG, getProviderByModel } from "@/lib/ai/config";
import { useBookStore } from "@/lib/book/bookContext";
import { authFetch } from "@/lib/api";
import { ClaudeModel, GeminiModel } from "@/lib/book/types";
import {
  FileText,
  RefreshCw,
  ChevronDown,
  Edit2,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "../../_components/Button";

export default function TOCReviewStep() {
  const router = useRouter();
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const bookTitle = useBookStore((state) => state.bookTitle);
  const sourceText = useBookStore((state) => state.sourceText);
  const aiConfiguration = useBookStore((state) => state.aiConfiguration);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const { setSelectedModel, regenerateTOC, updateDraft } = useBookStore(
    (state) => state.actions,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProvider = aiConfiguration.content.provider;
  const selectedModel = aiConfiguration.content.model;

  const handleEditStart = () => {
    setTempTitle(bookTitle);
    setTempTOC([...tableOfContents]);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateDraft({
      bookTitle: tempTitle.trim() || "Untitled Book",
      tableOfContents: tempTOC.filter((t) => t.trim() !== ""),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const addChapter = () => {
    setTempTOC([...tempTOC, ""]);
  };

  const removeChapter = (index: number) => {
    setTempTOC(tempTOC.filter((_, i) => i !== index));
  };

  const updateChapter = (index: number, value: string) => {
    const newTOC = [...tempTOC];
    newTOC[index] = value;
    setTempTOC(newTOC);
  };

  const handleStartWriting = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const bookId = crypto.randomUUID();

      const res = await authFetch("/api/book/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          title: bookTitle || "Untitled Book",
          tableOfContents,
          sourceText: sourceText || "",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "책 저장에 실패했습니다.");
      }

      router.push(`/book/new/${bookId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      alert(`오류: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-foreground">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Review Table of Contents
          </h1>
          <p className="text-sm text-neutral-500 font-sans max-w-md mx-auto">
            Review and refine the book structure. You can edit chapter titles or
            regenerate the entire outline.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-background border border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 font-sans">
              Chapters Outline
            </h2>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-8 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    className="h-8 px-4 text-xs gap-1.5"
                  >
                    <Check size={14} />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleEditStart}
                  className="h-8 px-3 text-xs gap-1.5 bg-background border-neutral-300 text-foreground hover:bg-neutral-50 rounded-full"
                >
                  <Edit2 size={13} />
                  Edit List
                </Button>
              )}
            </div>
          </div>

          <div className="p-8 md:p-10">
            {isEditing ? (
              <div className="space-y-6">
                <div className="pb-4 border-b border-neutral-200">
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 font-sans mb-2">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="Enter book title..."
                    className="w-full text-2xl font-bold leading-relaxed text-foreground bg-transparent border-b-2 border-neutral-200 focus:outline-none focus:border-brand-600 py-2 transition-colors"
                  />
                </div>
                <div className="space-y-4">
                  {tempTOC.map((chapter, idx) => (
                    <div key={idx} className="flex items-center gap-3 group">
                      <span className="font-bold w-6 text-neutral-400 font-sans">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => updateChapter(idx, e.target.value)}
                        placeholder={`Chapter ${idx + 1} title...`}
                        className="flex-1 text-lg leading-relaxed text-foreground bg-transparent border-b border-neutral-200 focus:outline-none focus:border-brand-600 py-1 transition-colors"
                      />
                      <button
                        onClick={() => removeChapter(idx)}
                        className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                        title="Remove chapter"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addChapter}
                    className="w-full py-3 mt-4 border border-dashed border-neutral-200 rounded-xl flex items-center justify-center gap-2 text-neutral-600 hover:text-brand-600 hover:border-brand-600 hover:bg-neutral-50 transition-all font-sans text-xs uppercase tracking-wider"
                  >
                    <Plus size={14} />
                    Add Chapter
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="pb-4 border-b border-neutral-200 text-center">
                  <h2 className="text-2xl font-bold text-foreground">
                    {bookTitle || "Untitled Book"}
                  </h2>
                </div>
                {tableOfContents?.length > 0 ? (
                  <div className="space-y-5">
                    {tableOfContents.map((chapter, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline gap-4 group"
                      >
                        <span className="font-bold text-neutral-400 font-sans w-5">
                          {idx + 1}
                        </span>
                        <span className="text-lg leading-relaxed text-foreground">
                          {chapter}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-neutral-500 italic font-sans text-sm">
                    No chapters generated yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Section */}
        {!isEditing && (
          <div className="pt-4 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-neutral-50 border border-neutral-200 rounded-2xl">
              <div className="space-y-1.5 text-center md:text-left">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 font-sans">
                  Intelligence Engine
                </h3>
                <div className="relative inline-block">
                  <select
                    className="appearance-none bg-transparent py-1 pl-0 pr-6 text-sm font-medium text-foreground focus:outline-none cursor-pointer hover:text-brand-600 transition-colors font-sans"
                    value={selectedModel}
                    onChange={(e) => {
                      const modelId = e.target.value;
                      const providerId = getProviderByModel(modelId);
                      if (providerId) {
                        setSelectedModel(
                          providerId,
                          modelId as GeminiModel | ClaudeModel,
                        );
                      }
                    }}
                  >
                    {AI_CONFIG.map((provider) => (
                      <optgroup key={provider.id} label={provider.name}>
                        {provider.models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-neutral-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={regenerateTOC}
                  disabled={isProcessing}
                  className="flex-1 md:flex-none gap-2 px-6 bg-background border-neutral-300 text-foreground hover:bg-neutral-50 rounded-full"
                >
                  <RefreshCw
                    size={16}
                    className={isProcessing ? "animate-spin" : ""}
                  />
                  Regenerate
                </Button>
                <Button
                  variant="primary"
                  onClick={handleStartWriting}
                  disabled={
                    isProcessing || isSaving || tableOfContents.length === 0
                  }
                  className="flex-1 md:flex-none gap-2 px-8 shadow-lg shadow-brand-900/10 rounded-full"
                >
                  <FileText size={16} />
                  {isSaving ? "저장 중..." : "Start Writing"}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-600 text-center font-sans">
              Click <strong>Start Writing</strong> to begin generating the full
              content for each chapter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
