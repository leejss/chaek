"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bookStoreActions, useBookStore } from "@/context/bookStore";
import { useSettingsStore } from "@/context/settingsStore";
import { generateTocAction } from "@/lib/actions/ai";
import Button from "@/components/Button";

export default function SourceInputStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceText = useBookStore((state) => state.sourceText);
  const aiConfiguration = useSettingsStore((state) => state.aiConfiguration);
  const { updateDraft, setTocResult } = bookStoreActions;

  const language = useSettingsStore((state) => state.language);
  const chapterCount = useSettingsStore((state) => state.chapterCount);
  const userPreference = useSettingsStore((state) => state.userPreference);

  const handleGenerateTOC = async () => {
    if (!sourceText?.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateTocAction({
        sourceText,
        language,
        chapterCount,
        userPreference,
        provider: aiConfiguration.toc.provider,
        model: aiConfiguration.toc.model,
      });

      setTocResult(result.title, result.chapters);
      router.push("/book/new?step=toc_review");
    } catch (err) {
      console.error("TOC generation failed:", err);
      setError("TOC 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

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
          placeholder="Paste your source text here..."
          value={sourceText || ""}
          onChange={(e) => updateDraft({ sourceText: e.target.value })}
        />
        <div className="absolute bottom-4 right-4 text-xs font-bold text-black bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 uppercase tracking-wide">
          {sourceText?.length || 0} chars
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-6">
        <Button
          onClick={handleGenerateTOC}
          disabled={!sourceText?.trim() || isLoading}
          isLoading={isLoading}
          className="w-full md:w-auto h-14 px-12 text-lg font-bold rounded-full"
        >
          GENERATE STRUCTURE
        </Button>
      </div>
    </div>
  );
}
