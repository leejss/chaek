"use client";

import { AI_CONFIG, getProviderByModel } from "@/lib/ai/config";
import { useBookStore } from "@/lib/book/bookContext";
import { ClaudeModel, GeminiModel } from "@/lib/book/types";
import { FileText, RefreshCw } from "lucide-react";
import Button from "../../_components/Button";

export default function TOCReviewStep() {
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const aiConfiguration = useBookStore((state) => state.aiConfiguration);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const { setSelectedModel, regenerateTOC, startBookGeneration } = useBookStore(
    (state) => state.actions,
  );
  const selectedProvider = aiConfiguration.content.provider || AI_CONFIG[0].id;
  const selectedModel =
    aiConfiguration.content.model ||
    (AI_CONFIG[0].models[0].id as GeminiModel | ClaudeModel);

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif text-brand-900 mb-3">
          Table of Contents
        </h2>
        <p className="text-stone-500">
          Review the generated chapter structure before writing.
        </p>
      </div>

      <div className="bg-paper border border-stone-200 p-8 rounded-sm shadow-inner">
        <ul className="space-y-4">
          {tableOfContents?.map((chapter, idx) => (
            <li key={idx} className="flex items-start">
              <span className="font-serif font-bold text-stone-300 mr-4 text-xl">
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <span className="font-serif text-lg text-ink-900 border-b border-stone-200 pb-1 w-full">
                {chapter}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 p-4 bg-stone-50 rounded border border-stone-200">
          <label className="text-sm font-medium text-stone-600">
            Writing Model:
          </label>
          <select
            className="bg-white border border-stone-300 rounded px-3 py-1 text-sm focus:ring-brand-900"
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
                    {model.name} ({model.description})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={regenerateTOC}
            isLoading={isProcessing}
            className="flex-1"
          >
            <RefreshCw size={16} className="mr-2" />
            Regenerate TOC
          </Button>
          <Button
            onClick={() => startBookGeneration(selectedProvider, selectedModel)}
            className="flex-2"
          >
            <FileText size={16} className="mr-2" />
            Start Book Generation
          </Button>
        </div>
      </div>
    </div>
  );
}
