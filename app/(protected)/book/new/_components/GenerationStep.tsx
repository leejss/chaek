"use client";

import React, { useEffect, useRef } from "react";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import Button from "../../_components/Button";

interface GenerationStepProps {
  streamingContent: string;
  tableOfContents?: string[];
  currentChapterIndex?: number | null;
  awaitingChapterDecision?: boolean;
  onConfirmChapter?: () => void;
  onCancelGeneration?: () => void;
}

export default function GenerationStep({
  streamingContent,
  tableOfContents,
  currentChapterIndex,
  awaitingChapterDecision,
  onConfirmChapter,
  onCancelGeneration,
}: GenerationStepProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-0 bg-white/95 backdrop-blur py-2 border-b border-brand-100 mb-8 z-10 flex items-center justify-center gap-2 text-brand-700">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-700 border-t-transparent"></div>
        <span className="text-sm font-medium uppercase tracking-widest">
          {awaitingChapterDecision
            ? "Chapter ready for review"
            : "Writing in progress..."}
        </span>
      </div>

      {tableOfContents && typeof currentChapterIndex === "number" && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded p-4">
          <div className="text-sm text-stone-600">
            {`Chapter ${currentChapterIndex + 1} of ${tableOfContents.length}`}
          </div>
          <div className="font-serif text-lg text-ink-900 mt-1">
            {tableOfContents[currentChapterIndex]}
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={onCancelGeneration}
              className="flex-1"
              disabled={!onCancelGeneration}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirmChapter}
              className="flex-1"
              disabled={!awaitingChapterDecision || !onConfirmChapter}
            >
              Confirm Chapter
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white min-h-[500px]">
        <MarkdownRenderer content={streamingContent} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
