"use client";

import React from "react";
import { RefreshCw, FileText } from "lucide-react";
import Button from "../../_components/Button";
import { GeminiModel } from "@/lib/book/types";

interface TOCReviewStepProps {
  tableOfContents: string[];
  selectedModel: GeminiModel;
  isProcessing: boolean;
  onSetSelectedModel: (model: GeminiModel) => void;
  onRegenerateTOC: () => void;
  onStartGeneration: () => void;
}

export default function TOCReviewStep({
  tableOfContents,
  selectedModel,
  isProcessing,
  onSetSelectedModel,
  onRegenerateTOC,
  onStartGeneration,
}: TOCReviewStepProps) {
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
            value={selectedModel || GeminiModel.FLASH}
            onChange={(e) => onSetSelectedModel(e.target.value as GeminiModel)}
          >
            <option value={GeminiModel.FLASH}>Gemini 2.5 Flash (Fast)</option>
            <option value={GeminiModel.PRO}>Gemini 2.5 Pro (Quality)</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={onRegenerateTOC}
            isLoading={isProcessing}
            className="flex-1"
          >
            <RefreshCw size={16} className="mr-2" />
            Regenerate TOC
          </Button>
          <Button onClick={onStartGeneration} className="flex-2">
            <FileText size={16} className="mr-2" />
            Start Book Generation
          </Button>
        </div>
      </div>
    </div>
  );
}

