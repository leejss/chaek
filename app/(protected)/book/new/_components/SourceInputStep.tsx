"use client";

import { Sparkles } from "lucide-react";
import Button from "../../_components/Button";

interface SourceInputStepProps {
  sourceText: string;
  isProcessing: boolean;
  onUpdateDraft: (data: { sourceText: string }) => void;
  onGenerateTOC: (text: string) => void;
}

export default function SourceInputStep({
  sourceText,
  isProcessing,
  onUpdateDraft,
  onGenerateTOC,
}: SourceInputStepProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif text-brand-900 mb-3">
          Source Material
        </h2>
        <p className="text-stone-500">
          Paste your notes, transcript, or outline below. <br />
          The AI will organize this into a coherent book structure.
        </p>
      </div>

      <div className="relative">
        <textarea
          className="w-full h-96 p-6 bg-stone-50 border border-stone-300 rounded-sm focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all font-serif text-lg leading-relaxed resize-none placeholder:text-stone-300 placeholder:italic"
          placeholder="Paste your source text here..."
          value={sourceText || ""}
          onChange={(e) => onUpdateDraft({ sourceText: e.target.value })}
        />
        <div className="absolute bottom-4 right-4 text-xs text-stone-400 bg-white/80 px-2 py-1 rounded">
          {sourceText?.length || 0} chars
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => onGenerateTOC(sourceText || "")}
          disabled={!sourceText}
          isLoading={isProcessing}
          className="w-full md:w-auto h-12 px-8 text-lg"
        >
          <Sparkles size={18} className="mr-2" />
          Generate Book Structure
        </Button>
      </div>
    </div>
  );
}
