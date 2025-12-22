"use client";

import { Sparkles, Cpu, Check } from "lucide-react";
import Button from "../../_components/Button";
import { ClaudeModel, GeminiModel, BookDraft } from "@/lib/book/types";
import { AI_CONFIG, getProviderByModel } from "@/lib/ai/config";
import { useBookStore } from "@/lib/book/bookContext";

export default function SourceInputStep() {
  const currentBook = useBookStore((state) => state.currentBook);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const { updateDraft, generateTOC } = useBookStore((state) => state.actions);

  const sourceText = currentBook.sourceText || "";
  const selectedModel = currentBook.selectedModel as
    | GeminiModel
    | ClaudeModel
    | undefined;

  const handleModelChange = (modelId: string) => {
    const providerId = getProviderByModel(modelId);
    if (providerId) {
      updateDraft({
        selectedProvider: providerId,
        selectedModel: modelId as GeminiModel | ClaudeModel,
      });
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif text-brand-900 mb-3">
          Source Material
        </h2>
        <p className="text-stone-500">
          Paste your notes, transcript, or outline below. <br />
          The AI will organize this into a coherent book structure.
        </p>
      </div>

      {/* AI Configuration Section */}
      <div className="bg-stone-50 border border-stone-200 rounded-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={18} className="text-brand-700" />
          <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
            AI Writer Configuration
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AI_CONFIG.map((provider) => (
            <div key={provider.id} className="space-y-2">
              <label className="text-xs font-semibold text-stone-400 px-1 uppercase">
                {provider.name}
              </label>
              <div className="flex flex-col gap-2">
                {provider.models.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={`
                        flex items-center justify-between p-3 rounded-sm border transition-all text-left
                        ${
                          isSelected
                            ? "bg-white border-brand-900 ring-1 ring-brand-900 shadow-sm"
                            : "bg-white/50 border-stone-200 hover:border-stone-400 text-stone-600"
                        }
                      `}
                    >
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-bold ${
                            isSelected ? "text-brand-900" : "text-stone-700"
                          }`}
                        >
                          {model.name}
                        </span>
                        <span className="text-[10px] text-stone-400 leading-tight mt-0.5">
                          {model.description}
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-brand-900" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <textarea
          className="w-full h-96 p-6 bg-paper border border-stone-300 rounded-sm focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all font-serif text-lg leading-relaxed resize-none placeholder:text-stone-300 placeholder:italic shadow-inner"
          placeholder="Paste your source text here..."
          value={sourceText || ""}
          onChange={(e) => updateDraft({ sourceText: e.target.value })}
        />
        <div className="absolute bottom-4 right-4 text-xs text-stone-400 bg-white/80 px-2 py-1 rounded">
          {sourceText?.length || 0} chars
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => generateTOC(sourceText || "")}
          disabled={!sourceText}
          isLoading={isProcessing}
          className="w-full md:w-auto h-12 px-10 text-lg"
        >
          <Sparkles size={18} className="mr-2" />
          Generate Book Structure
        </Button>
      </div>
    </div>
  );
}
