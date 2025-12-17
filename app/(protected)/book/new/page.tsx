"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles, RefreshCw, FileText } from "lucide-react";
import { useBook } from "@/lib/book/bookContext";
import Button from "../_components/Button";
import MarkdownRenderer from "../_components/MarkdownRenderer";
import { GeminiModel } from "@/lib/book/types";

export default function CreateBookPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    state: { currentBook, isProcessing, streamingContent },
    actions: {
      updateDraft,
      generateTOC,
      regenerateTOC,
      startBookGeneration,
      setSelectedModel,
    },
  } = useBook();

  // Scroll to bottom during generation
  useEffect(() => {
    if (bottomRef.current && currentBook.status === "generating_book") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent, currentBook.status]);

  // Redirect on completion
  useEffect(() => {
    if (currentBook.status === "completed" && currentBook.id) {
      router.push(`/book/${currentBook.id}`);
    }
  }, [currentBook.status, currentBook.id, router]);

  const handleReturnToList = () => {
    router.push("/book");
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-stone-200 shadow-xl rounded-sm min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
        <button
          onClick={handleReturnToList}
          className="flex items-center text-stone-500 hover:text-brand-900 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Library
        </button>

        <div className="px-3 py-1 bg-stone-200 text-stone-600 text-xs font-bold rounded uppercase tracking-wider">
          {currentBook.status?.replace("_", " ")}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
        {/* STEP 1: SOURCE INPUT */}
        {currentBook.status === "draft" && (
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
                value={currentBook.sourceText}
                onChange={(e) => updateDraft({ sourceText: e.target.value })}
              />
              <div className="absolute bottom-4 right-4 text-xs text-stone-400 bg-white/80 px-2 py-1 rounded">
                {currentBook.sourceText?.length || 0} chars
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => generateTOC(currentBook.sourceText || "")}
                disabled={!currentBook.sourceText}
                isLoading={isProcessing}
                className="w-full md:w-auto h-12 px-8 text-lg"
              >
                <Sparkles size={18} className="mr-2" />
                Generate Book Structure
              </Button>
            </div>
            <p className="text-center text-xs text-stone-400 mt-2">
              Analysis performed by Haiku 4.5
            </p>
          </div>
        )}

        {/* STEP 2: TOC REVIEW */}
        {currentBook.status === "toc_review" && (
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
                {currentBook.tableOfContents?.map((chapter, idx) => (
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
                  value={currentBook.selectedModel || GeminiModel.FLASH}
                  onChange={(e) =>
                    setSelectedModel(e.target.value as GeminiModel)
                  }
                >
                  <option value={GeminiModel.FLASH}>
                    Gemini 2.5 Flash (Fast)
                  </option>
                  <option value={GeminiModel.PRO}>
                    Gemini 2.5 Pro (Quality)
                  </option>
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
                  onClick={() => startBookGeneration()}
                  className="flex-[2]"
                >
                  <FileText size={16} className="mr-2" />
                  Start Book Generation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: GENERATION STREAMING */}
        {currentBook.status === "generating_book" && (
          <div className="max-w-3xl mx-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur py-2 border-b border-brand-100 mb-8 z-10 flex items-center justify-center gap-2 text-brand-700">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-700 border-t-transparent"></div>
              <span className="text-sm font-medium uppercase tracking-widest">
                Writing in progress...
              </span>
            </div>

            <div className="bg-white min-h-[500px]">
              <MarkdownRenderer content={streamingContent} />
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
