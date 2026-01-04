"use client";

import { bookStoreActions, useBookStore } from "@/lib/book/bookContext";
import Button from "../../../_components/Button";

export default function SourceInputStep() {
  const sourceText = useBookStore((state) => state.sourceText);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const { updateDraft, generateTOC } = bookStoreActions;

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-black mb-4 tracking-tight uppercase">
          Source Text
        </h2>
        <p className="text-neutral-500 font-medium">
          Paste your source text below. The AI will organize this into a
          coherent book structure.
        </p>
      </div>

      <div className="relative">
        <textarea
          className="w-full h-96 p-6 bg-white border-2 border-neutral-200 rounded-xl focus:border-black focus:ring-0 transition-all text-lg leading-relaxed resize-none placeholder:text-neutral-400 font-medium text-black shadow-none"
          placeholder="PASTE YOUR SOURCE TEXT HERE..."
          value={sourceText || ""}
          onChange={(e) => updateDraft({ sourceText: e.target.value })}
        />
        <div className="absolute bottom-4 right-4 text-xs font-bold text-black bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 uppercase tracking-wide">
          {sourceText?.length || 0} chars
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button
          onClick={() => generateTOC(sourceText || "")}
          disabled={!sourceText}
          isLoading={isProcessing}
          className="w-full md:w-auto h-14 px-12 text-lg font-bold rounded-full"
        >
          GENERATE STRUCTURE
        </Button>
      </div>
    </div>
  );
}
