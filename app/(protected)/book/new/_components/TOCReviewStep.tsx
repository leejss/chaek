"use client";

import { useState } from "react";
import {
  AI_CONFIG,
  getProviderByModel,
  aiProvider,
  GeminiModel,
  ClaudeModel,
} from "@/lib/ai/config";
import {
  failTocGeneration,
  setTocResult,
  startTocGeneration,
  update,
  useBookStore,
} from "@/context/bookStore";
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
import { BookGenerationSettings, Language } from "@/context/types/settings";
import { AIProvider } from "@/lib/ai/config";

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
 * Pure function to resolve generation settings
 */
const resolveGenerationSettings = (
  contentProvider: AIProvider,
  contentModel: GeminiModel | ClaudeModel,
  language: Language,
  chapterCount: number | "Auto",
  userPreference: string,
): BookGenerationSettings => ({
  language,
  chapterCount,
  userPreference,
  provider:
    contentProvider || getProviderByModel(contentModel) || aiProvider.ANTHROPIC,
  model: contentModel,
});

/**
 * Sub-components for declarative rendering
 */
const TOCHeader = () => (
  <div className="text-center space-y-4">
    <h1 className="text-4xl font-extrabold text-black">Review Structure</h1>
    <p className="text-neutral-500 font-medium max-w-md mx-auto">
      Review and refine the book structure. You can edit chapter titles or
      regenerate the entire outline.
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
        <Button
          variant="ghost"
          onClick={onCancel}
          className="h-8 px-4 text-xs font-bold"
        >
          CANCEL
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          className="h-8 px-4 text-xs gap-2 font-bold"
        >
          <Check size={14} strokeWidth={3} />
          SAVE CHANGES
        </Button>
      </>
    ) : (
      <Button
        variant="outline"
        onClick={onEditStart}
        className="h-8 px-4 text-xs gap-2 font-bold bg-white border-neutral-300 text-black hover:bg-neutral-50 rounded-full"
      >
        <Edit2 size={12} strokeWidth={3} />
        EDIT LIST
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
  <div className="flex items-center gap-4 group">
    <span className="font-bold w-6 text-neutral-400">
      {String(index + 1).padStart(2, "0")}
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`CHAPTER ${index + 1} TITLE...`}
      className="flex-1 text-lg font-medium text-black bg-transparent border-b border-neutral-200 focus:outline-none focus:border-black py-2 transition-colors placeholder:text-neutral-300"
    />
    <button
      onClick={onRemove}
      className="p-2 text-neutral-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
      title="Remove chapter"
    >
      <Trash2 size={16} strokeWidth={2.5} />
    </button>
  </div>
);

const ChapterDisplay = ({ index, title }: { index: number; title: string }) => (
  <div className="flex items-baseline gap-5 group">
    <span className="font-mono font-bold text-neutral-400 text-sm">
      {String(index + 1).padStart(2, "0")}
    </span>
    <span className="text-lg font-bold text-black leading-relaxed">
      {title}
    </span>
  </div>
);

const ModelSelector = ({
  model,
  onModelChange,
}: {
  model: GeminiModel | ClaudeModel;
  onModelChange: (modelId: GeminiModel | ClaudeModel) => void;
}) => (
  <div className="space-y-2 text-center md:text-left w-full md:w-auto">
    <h3 className="text-sm font-bold text-black">Intelligence Engine</h3>
    <div className="relative inline-block w-full md:w-auto">
      <select
        className="appearance-none bg-transparent py-2 pl-0 pr-8 text-base font-bold text-black focus:outline-none cursor-pointer hover:text-neutral-600 transition-colors w-full md:w-auto border-b border-neutral-200 focus:border-black"
        value={model}
        onChange={(e) =>
          onModelChange(e.target.value as GeminiModel | ClaudeModel)
        }
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
  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
    <Button
      variant="outline"
      onClick={onRegenerate}
      disabled={isRegenerating}
      className="w-full sm:w-auto gap-2 px-6 h-12 bg-white border-2 border-neutral-200 text-black hover:border-black hover:bg-white rounded-full font-bold"
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
      onClick={onStartWriting}
      disabled={isRegenerating || isSaving || !hasChapters}
      className="w-full sm:w-auto gap-2 px-8 h-12 rounded-full font-bold shadow-none"
    >
      <FileText size={14} strokeWidth={3} />
      {isSaving ? "Saving" : "Start"}
    </Button>
  </div>
);

export default function TOCReviewStep() {
  const { tableOfContents, bookTitle, sourceText, tocGeneration } =
    useBookStore();
  const {
    tocProvider,
    tocModel,
    contentProvider,
    contentModel,
    language,
    chapterCount,
    userPreference,
  } = useSettingsStore();

  const { set } = settingsStoreActions;

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isRegenerating =
    tocGeneration.status === "loading" &&
    tocGeneration.variant === "regenerate";

  const handleEditStart = () => {
    setTempTitle(bookTitle);
    setTempTOC([...tableOfContents]);
    setIsEditing(true);
  };

  const handleSave = () => {
    update("bookTitle", TOC.formatTitle(tempTitle));
    update("tableOfContents", TOC.normalize(tempTOC));
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
      const generationSettings = resolveGenerationSettings(
        contentProvider,
        contentModel,
        language,
        chapterCount,
        userPreference,
      );

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
      set("contentProvider", providerId);
      set("contentModel", modelId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-black">
      <div className="space-y-10">
        <TOCHeader />

        {/* Main Content Card */}
        <div className="bg-white border-2 border-neutral-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b-2 border-neutral-200 flex items-center justify-between bg-white">
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
                      <ChapterDisplay key={idx} index={idx} title={chapter} />
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
              <ModelSelector
                model={contentModel}
                onModelChange={handleModelChange}
              />
            </div>
            <ActionButtons
              isRegenerating={isRegenerating}
              onRegenerate={handleRegenerateTOC}
              isSaving={isSaving}
              onStartWriting={handleStartWriting}
              hasChapters={tableOfContents.length > 0}
            />
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
