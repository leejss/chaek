"use client";

import { useState } from "react";
import {
  AI_CONFIG,
  getProviderByModel,
  AIProvider,
  ClaudeModel,
  GeminiModel,
} from "@/lib/ai/config";
import { bookStoreActions, useBookStore } from "@/context/bookStore";
import {
  settingsStoreActions,
  useSettingsStore,
} from "@/context/settingsStore";
import { createBookAction } from "@/lib/actions/book";
import { generateTocAction } from "@/lib/actions/ai";
import {
  FileText,
  RefreshCw,
  ChevronDown,
  Edit2,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/Button";
import { BookGenerationSettings } from "@/context/types/settings";

export default function TOCReviewStep() {
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const bookTitle = useBookStore((state) => state.bookTitle);
  const sourceText = useBookStore((state) => state.sourceText);
  const aiConfiguration = useSettingsStore((state) => state.aiConfiguration);
  const language = useSettingsStore((state) => state.language);
  const chapterCount = useSettingsStore((state) => state.chapterCount);
  const userPreference = useSettingsStore((state) => state.userPreference);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const { setTocResult, updateDraft } = bookStoreActions;
  const { setContentAiConfiguration } = settingsStoreActions;

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
      const provider =
        aiConfiguration.content.provider ||
        getProviderByModel(selectedModel) ||
        AIProvider.ANTHROPIC;

      const generationSettings: BookGenerationSettings = {
        language,
        chapterCount,
        userPreference,
        provider,
        model: selectedModel,
      };

      await createBookAction(
        bookTitle,
        tableOfContents,
        sourceText,
        generationSettings,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateTOC = async () => {
    if (!sourceText?.trim() || isRegenerating) return;

    setIsRegenerating(true);
    try {
      const result = await generateTocAction({
        sourceText,
        language,
        chapterCount,
        userPreference,
        provider: aiConfiguration.toc.provider,
        model: aiConfiguration.toc.model,
      });
      setTocResult(result.title, result.chapters);
    } catch (err) {
      console.error("TOC regeneration failed:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-black">
      <div className="space-y-10">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-black uppercase">
            Review Structure
          </h1>
          <p className="text-neutral-500 font-medium max-w-md mx-auto">
            Review and refine the book structure. You can edit chapter titles or
            regenerate the entire outline.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white border-2 border-neutral-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b-2 border-neutral-200 flex items-center justify-between bg-white">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black">
              Chapters Outline
            </h2>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-8 px-4 text-xs font-bold"
                  >
                    CANCEL
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    className="h-8 px-4 text-xs gap-2 font-bold"
                  >
                    <Check size={14} strokeWidth={3} />
                    SAVE CHANGES
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleEditStart}
                  className="h-8 px-4 text-xs gap-2 font-bold bg-white border-neutral-300 text-black hover:bg-neutral-50 rounded-full"
                >
                  <Edit2 size={12} strokeWidth={3} />
                  EDIT LIST
                </Button>
              )}
            </div>
          </div>

          <div className="p-8 md:p-10">
            {isEditing ? (
              <div className="space-y-8">
                <div className="pb-6 border-b border-neutral-200">
                  <label className="block text-xs font-bold uppercase tracking-widest text-black mb-3">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="ENTER BOOK TITLE..."
                    className="w-full text-2xl font-bold text-black bg-transparent border-b-2 border-neutral-200 focus:outline-none focus:border-black py-2 transition-colors placeholder:text-neutral-300"
                  />
                </div>
                <div className="space-y-4">
                  {tempTOC.map((chapter, idx) => (
                    <div key={idx} className="flex items-center gap-4 group">
                      <span className="font-bold w-6 text-neutral-400">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => updateChapter(idx, e.target.value)}
                        placeholder={`CHAPTER ${idx + 1} TITLE...`}
                        className="flex-1 text-lg font-medium text-black bg-transparent border-b border-neutral-200 focus:outline-none focus:border-black py-2 transition-colors placeholder:text-neutral-300"
                      />
                      <button
                        onClick={() => removeChapter(idx)}
                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove chapter"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addChapter}
                    className="w-full py-4 mt-6 border-2 border-dashed border-neutral-200 rounded-xl flex items-center justify-center gap-2 text-neutral-500 hover:text-black hover:border-black transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <Plus size={16} strokeWidth={3} />
                    Add Chapter
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="pb-6 border-b border-neutral-200 text-center">
                  <h2 className="text-3xl font-extrabold text-black tracking-tight">
                    {bookTitle || "Untitled Book"}
                  </h2>
                </div>
                {tableOfContents?.length > 0 ? (
                  <div className="space-y-6">
                    {tableOfContents.map((chapter, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline gap-5 group"
                      >
                        <span className="font-mono font-bold text-neutral-400 text-sm">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-lg font-bold text-black leading-relaxed">
                          {chapter}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-neutral-400 font-medium italic">
                    No chapters generated yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Section */}
        {!isEditing && (
          <div className="pt-6 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 bg-white border-2 border-neutral-200 rounded-xl">
              <div className="space-y-2 text-center md:text-left w-full md:w-auto">
                <h3 className="text-sm font-bold text-black">
                  Intelligence Engine
                </h3>
                <div className="relative inline-block w-full md:w-auto">
                  <select
                    className="appearance-none bg-transparent py-2 pl-0 pr-8 text-base font-bold text-black focus:outline-none cursor-pointer hover:text-neutral-600 transition-colors w-full md:w-auto border-b border-neutral-200 focus:border-black"
                    value={selectedModel}
                    onChange={(e) => {
                      const modelId = e.target.value;
                      const providerId = getProviderByModel(modelId);
                      if (providerId) {
                        setContentAiConfiguration(
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
                  <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-black">
                    <ChevronDown size={16} strokeWidth={3} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={handleRegenerateTOC}
                  disabled={isRegenerating}
                  className="w-full sm:w-auto gap-2 px-6 h-12 bg-white border-2 border-neutral-200 text-black hover:border-black hover:bg-white rounded-full font-bold uppercase tracking-wide text-xs"
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
                  disabled={
                    isRegenerating || isSaving || tableOfContents.length === 0
                  }
                  className="w-full sm:w-auto gap-2 px-8 h-12 rounded-full font-bold uppercase tracking-wide text-xs shadow-none"
                >
                  <FileText size={14} strokeWidth={3} />
                  {isSaving ? "SAVING..." : "START WRITING"}
                </Button>
              </div>
            </div>

            <p className="text-[11px] font-bold text-neutral-400 text-center uppercase tracking-wide">
              Click <span className="text-black">Start Writing</span> to begin
              generating the full content for each chapter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
