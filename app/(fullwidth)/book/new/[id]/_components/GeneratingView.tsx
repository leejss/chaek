"use client";

import GenerationStep from "@/app/(protected)/book/new/_components/GenerationStep";
import StatusOverviewGeneration from "@/app/(protected)/book/new/_components/StatusOverviewGeneration";
import type { BookGenerationSettings } from "@/lib/ai/schemas/settings";

interface GeneratingViewProps {
  bookTitle: string;
  sourceText: string;
  tableOfContents: string[];
  generationSettings: BookGenerationSettings;
  onCancel: () => void;
  isGenerating: boolean;
  error?: string | null;
}

export default function GeneratingView({
  bookTitle,
  sourceText,
  tableOfContents,
  generationSettings,
  onCancel,
  isGenerating,
  error,
}: GeneratingViewProps) {
  return (
    <div className="h-full w-full">
      <GenerationStep
        tableOfContents={tableOfContents}
        bookTitle={bookTitle}
        sourceText={sourceText}
        generationSettings={generationSettings}
      />
      <StatusOverviewGeneration
        bookTitle={bookTitle}
        sourceText={sourceText}
        tableOfContents={tableOfContents}
        generationSettings={generationSettings}
        onCancel={onCancel}
        isGenerating={isGenerating}
      />
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
