"use client";

import StatusOverviewGeneration from "@/app/(protected)/book/new/_components/StatusOverviewGeneration";
import GenerationStep from "@/app/(protected)/book/new/_components/GenerationStep";
import { BookGenerationSettings } from "@/lib/ai/schemas/settings";

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
    <div className="max-w-3xl mx-auto">
      <GenerationStep tableOfContents={tableOfContents} />
      <StatusOverviewGeneration
        bookTitle={bookTitle}
        sourceText={sourceText}
        tableOfContents={tableOfContents}
        generationSettings={generationSettings}
        onCancel={onCancel}
        isGenerating={isGenerating}
      />
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
