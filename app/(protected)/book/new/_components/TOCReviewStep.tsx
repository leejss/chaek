"use client";

import { Check, ChevronDown, Edit2, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/Button";
import { updateSettingsStore, useSettingsStore } from "@/context/settingsStore";
import {
  failTocGeneration,
  setTocResult,
  startTocGeneration,
  updateTocStore,
  useTocGenerationStore,
} from "@/context/tocStore";
import { generateTocAction } from "@/lib/actions/ai";
import { createBookAction } from "@/lib/actions/book";
import { AI_CONFIG, type ClaudeModel, type GeminiModel, getProviderByModel } from "@/lib/ai/config";

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

/**
 * Sub-components for declarative rendering
 */
const TOCHeader = () => (
  <div className="space-y-4 text-center">
    <h1 className="font-extrabold text-4xl text-black">Review Structure</h1>
    <p className="mx-auto max-w-md font-medium text-neutral-500">
      Review and refine the book structure. You can edit chapter titles or regenerate the entire
      outline.
    </p>
  </div>
);

const TOCActions = ({
  isEditing,
  onCancel,
  onSave,
  onEditStart,
}: {
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  onEditStart: () => void;
}) => (
  <div className="flex items-center gap-2">
    {isEditing ? (
      <>
        <Button variant="ghost" onClick={onCancel} className="h-8 px-4 font-bold text-xs">
          CANCEL
        </Button>
        <Button variant="primary" onClick={onSave} className="h-8 gap-2 px-4 font-bold text-xs">
          <Check size={14} strokeWidth={3} />
          SAVE CHANGES
        </Button>
      </>
    ) : (
      <Button
        variant="outline"
        onClick={onEditStart}
        className="h-8 gap-2 rounded-full border-neutral-300 bg-white px-4 font-bold text-black text-sm hover:bg-neutral-50"
      >
        <Edit2 size={12} strokeWidth={3} />
        Edit Outline
      </Button>
    )}
  </div>
);

const ChapterInput = ({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: string;
  onChange: (val: string) => void;
  onRemove: () => void;
}) => (
  <div className="group flex items-center gap-4">
    <span className="w-6 font-bold text-neutral-400">{String(index + 1).padStart(2, "0")}</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`CHAPTER ${index + 1} TITLE...`}
      className="flex-1 border-neutral-200 border-b bg-transparent py-2 font-medium text-black text-lg transition-colors placeholder:text-neutral-300 focus:border-black focus:outline-none"
    />
    <button
      onClick={onRemove}
      className="p-2 text-neutral-400 opacity-0 transition-colors hover:text-red-600 group-hover:opacity-100"
      title="Remove chapter"
    >
      <Trash2 size={16} strokeWidth={2.5} />
    </button>
  </div>
);

const ChapterDisplay = ({ index, title }: { index: number; title: string }) => (
  <div className="group flex items-baseline gap-5">
    <span className="font-bold font-mono text-neutral-400 text-sm">
      {String(index + 1).padStart(2, "0")}
    </span>
    <span className="font-bold text-black text-lg leading-relaxed">{title}</span>
  </div>
);

const ModelSelector = ({
  model,
  onModelChange,
}: {
  model: GeminiModel | ClaudeModel;
  onModelChange: (modelId: GeminiModel | ClaudeModel) => void;
}) => (
  <div className="w-full space-y-2 text-center md:w-auto md:text-left">
    <h3 className="font-bold text-black text-sm">Intelligence Engine</h3>
    <div className="relative inline-block w-full md:w-auto">
      <select
        className="w-full cursor-pointer appearance-none border-neutral-200 border-b bg-transparent py-2 pr-8 pl-0 font-bold text-base text-black transition-colors hover:text-neutral-600 focus:border-black focus:outline-none md:w-auto"
        value={model}
        onChange={(e) => onModelChange(e.target.value as GeminiModel | ClaudeModel)}
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
      <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-black">
        <ChevronDown size={16} strokeWidth={3} />
      </div>
    </div>
  </div>
);

const ActionButtons = ({
  isRegenerating,
  onRegenerate,
  isSaving,
  onStartWriting,
  hasChapters,
}: {
  isRegenerating: boolean;
  onRegenerate: () => void;
  isSaving: boolean;
  onStartWriting: () => void;
  hasChapters: boolean;
}) => (
  <div className="flex w-full flex-col items-center gap-4 sm:flex-row md:w-auto">
    <Button
      variant="outline"
      onClick={onRegenerate}
      disabled={isRegenerating}
      className="h-12 w-full gap-2 rounded-full border-2 border-neutral-200 bg-white px-6 font-bold text-black hover:border-black hover:bg-white sm:w-auto"
    >
      <RefreshCw size={14} strokeWidth={3} className={isRegenerating ? "animate-spin" : ""} />
      Regenerate
    </Button>
    <Button
      variant="primary"
      onClick={onStartWriting}
      disabled={isRegenerating || isSaving || !hasChapters}
      className="h-12 w-full gap-2 rounded-full px-8 font-bold shadow-none sm:w-auto"
    >
      <FileText size={14} strokeWidth={3} />
      {isSaving ? "Saving" : "Start"}
    </Button>
  </div>
);

export default function TOCReviewStep() {
  const { tableOfContents, bookTitle, sourceText, tocGeneration } = useTocGenerationStore();
  const tocProvider = useSettingsStore((state) => state.tocProvider);
  const tocModel = useSettingsStore((state) => state.tocModel);
  const contentProvider = useSettingsStore((state) => state.contentProvider);
  const contentModel = useSettingsStore((state) => state.contentModel);
  const settings = useSettingsStore((state) => state.settings);
  const { language, chapterCount, userPreference } = settings;

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isRegenerating =
    tocGeneration.status === "loading" && tocGeneration.variant === "regenerate";

  const handleEditStart = () => {
    setTempTitle(bookTitle);
    setTempTOC([...tableOfContents]);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateTocStore("bookTitle", TOC.formatTitle(tempTitle));
    updateTocStore("tableOfContents", TOC.normalize(tempTOC));
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

    setIsSaving(true);
    try {
      await createBookAction(bookTitle, tableOfContents, sourceText, {
        provider: contentProvider,
        model: contentModel,
        language,
        chapterCount,
        userPreference,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!sourceText?.trim() || isRegenerating) return;

    startTocGeneration("regenerate");
    try {
      const result = await generateTocAction({
        sourceText,
        language,
        chapterCount,
        userPreference,
        provider: tocProvider,
        model: tocModel,
      });
      setTocResult(result.title, result.chapters);
    } catch (err) {
      console.error("TOC regeneration failed:", err);
      failTocGeneration("TOC 재생성에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const handleModelChange = (modelId: GeminiModel | ClaudeModel) => {
    const providerId = getProviderByModel(modelId);
    if (providerId) {
      updateSettingsStore("contentProvider", providerId);
      updateSettingsStore("contentModel", modelId);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-black">
      <div className="space-y-10">
        <TOCHeader />

        {/* Main Content Card */}
        <div className="overflow-hidden rounded-xl border-2 border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-neutral-200 border-b-2 bg-white p-6">
            <h2 className="font-bold text-black">Chapters Outline</h2>
            <TOCActions
              isEditing={isEditing}
              onCancel={handleCancel}
              onSave={handleSave}
              onEditStart={handleEditStart}
            />
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
                    <ChapterInput
                      key={idx}
                      index={idx}
                      value={chapter}
                      onChange={(val) => updateChapter(idx, val)}
                      onRemove={() => removeChapter(idx)}
                    />
                  ))}
                  <button
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
                      <ChapterDisplay key={idx} index={idx} title={chapter} />
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
          <div className="space-y-8 pt-6">
            <div className="flex flex-col items-center justify-between gap-8 rounded-xl border-2 border-neutral-200 bg-white p-8 md:flex-row">
              <ModelSelector model={contentModel} onModelChange={handleModelChange} />
            </div>
            <ActionButtons
              isRegenerating={isRegenerating}
              onRegenerate={handleRegenerate}
              isSaving={isSaving}
              onStartWriting={handleStartWriting}
              hasChapters={tableOfContents.length > 0}
            />
            <p className="text-center font-bold text-[11px] text-neutral-400 uppercase tracking-wide">
              Click <span className="text-black">Start Writing</span> to begin generating the full
              content for each chapter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
