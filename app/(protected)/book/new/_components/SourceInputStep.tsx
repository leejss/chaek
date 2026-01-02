"use client";

import { bookStoreActions, useBookStore } from "@/lib/book/bookContext";
import Button from "../../_components/Button";

export default function SourceInputStep() {
  const sourceText = useBookStore((state) => state.sourceText);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const { updateDraft, generateTOC } = bookStoreActions;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-3">Source Text</h2>
        <p className="text-neutral-600">
          Paste your source text below. The AI will organize this into a
          coherent book structure.
        </p>
      </div>

      <div className="relative">
        <textarea
          className="w-full h-96 p-6 bg-background border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-all text-lg leading-relaxed resize-none placeholder:text-neutral-500 placeholder:italic shadow-inner text-foreground"
          placeholder="Paste your source text here..."
          value={sourceText || ""}
          onChange={(e) => updateDraft({ sourceText: e.target.value })}
        />
        <div className="absolute bottom-4 right-4 text-xs text-neutral-600 bg-white/80 px-2 py-1 rounded border border-neutral-200">
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
          Generate Book Structure
        </Button>
      </div>
    </div>
  );
}
