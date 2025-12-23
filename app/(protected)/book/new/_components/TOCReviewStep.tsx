"use client";

import { useState } from "react";
import { AI_CONFIG, getProviderByModel } from "@/lib/ai/config";
import { useBookStore } from "@/lib/book/bookContext";
import { ClaudeModel, GeminiModel } from "@/lib/book/types";
import {
  FileText,
  RefreshCw,
  ChevronDown,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
} from "lucide-react";

export default function TOCReviewStep() {
  const title = useBookStore((state) => state.title);
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const aiConfiguration = useBookStore((state) => state.aiConfiguration);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const { setSelectedModel, regenerateTOC, startBookGeneration, updateDraft } =
    useBookStore((state) => state.actions);

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);

  const selectedProvider = aiConfiguration.content.provider || AI_CONFIG[0].id;
  const selectedModel =
    aiConfiguration.content.model ||
    (AI_CONFIG[0].models[0].id as GeminiModel | ClaudeModel);

  const handleEditStart = () => {
    setTempTOC([...tableOfContents]);
    setTempTitle(title || "Untitled Book");
    setIsEditing(true);
  };

  const handleSave = () => {
    updateDraft({
      title: tempTitle,
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-serif text-black">
      <div className="grid gap-16 lg:grid-cols-[1fr_280px]">
        {/* Main Content - Academic Paper Style */}
        <div className="min-h-[500px]">
          <header className="mb-8">
            <div className="border-t-2 border-black pt-6" />
            <div className="text-center">
              {isEditing ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Enter book title..."
                  className="w-full text-3xl font-bold tracking-tight text-center text-black bg-stone-50 border-b border-stone-300 focus:outline-none focus:border-black py-1"
                />
              ) : (
                <h1 className="text-3xl font-bold tracking-tight text-black">
                  {title || "Table of Contents"}
                </h1>
              )}
              {!isEditing && title && (
                <p className="mt-2 text-sm uppercase tracking-widest text-stone-500 font-sans">
                  Table of Contents
                </p>
              )}
            </div>
            <div className="border-b-2 border-black mt-6" />
          </header>

          <div className="max-w-none">
            {isEditing ? (
              <div className="space-y-4">
                {tempTOC.map((chapter, idx) => (
                  <div key={idx} className="flex items-center gap-3 group">
                    <span className="text-sm font-bold w-6 text-stone-400 font-sans">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={chapter}
                      onChange={(e) => updateChapter(idx, e.target.value)}
                      placeholder={`Chapter ${idx + 1} title...`}
                      className="flex-1 text-lg leading-relaxed text-black bg-white border-b border-stone-200 focus:outline-none focus:border-black py-1"
                    />
                    <button
                      onClick={() => removeChapter(idx)}
                      className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                      title="Remove chapter"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addChapter}
                  className="w-full py-4 mt-4 border border-dashed border-stone-300 flex items-center justify-center gap-2 text-stone-500 hover:text-black hover:border-black transition-all font-sans text-sm"
                >
                  <Plus size={16} />
                  Add New Chapter
                </button>
              </div>
            ) : (
              <>
                {tableOfContents?.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-4 marker:font-bold marker:text-black">
                    {tableOfContents.map((chapter, idx) => (
                      <li key={idx} className="pl-2">
                        <span className="text-lg leading-relaxed text-black">
                          {chapter}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="py-12 border border-dashed border-stone-300 text-center text-stone-600 italic">
                    No content generated.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar - Control Panel */}
        <div className="space-y-8">
          {/* Edit Mode Toggle */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-3 font-sans">
              Mode
            </h3>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-2 border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
                >
                  <Check size={14} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center gap-2 border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-stone-50 transition-colors"
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditStart}
                className="w-full inline-flex items-center justify-center gap-2 border border-black bg-white px-3 py-2 text-sm font-medium text-black hover:bg-stone-50 transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
          </section>

          {/* Model Selection & Actions */}
          {!isEditing && (
            <>
              {/* Model Selection */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-3 font-sans">
                  Configuration
                </h3>
                <div className="relative border border-stone-400 bg-white">
                  <select
                    className="w-full appearance-none bg-transparent py-2 pl-3 pr-8 text-sm focus:outline-none rounded-none font-sans"
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
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                    <ChevronDown size={14} className="text-stone-600" />
                  </div>
                </div>
              </section>

              {/* Actions */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-3 font-sans">
                  Actions
                </h3>
                <button
                  type="button"
                  onClick={regenerateTOC}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-start gap-2 border border-black bg-white px-3 py-2 text-sm font-medium text-black hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={14}
                    className={isProcessing ? "animate-spin" : ""}
                  />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startBookGeneration(selectedProvider, selectedModel)
                  }
                  disabled={isProcessing || tableOfContents.length === 0}
                  className="w-full inline-flex items-center justify-start gap-2 border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={14} />
                  Generate Book
                </button>
              </section>
            </>
          )}

          {/* Note */}
          <div className="text-xs text-stone-600 leading-relaxed border-t border-stone-200 pt-4 font-sans">
            <span className="font-bold text-black italic">Note: </span>
            {isEditing
              ? "You are in edit mode. Make sure to save your changes before proceeding to generation."
              : "Ensure the chapter outline meets the requirements before proceeding to the full generation phase."}
          </div>
        </div>
      </div>
    </div>
  );
}
