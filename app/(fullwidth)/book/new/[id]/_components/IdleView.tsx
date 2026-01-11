"use client";

import { cn } from "@/utils";
import Button from "@/components/Button";

interface IdleViewProps {
  bookTitle: string;
  tableOfContents: string[];
  chapters: {
    chapterNumber: number;
    chapterTitle: string;
    content: string;
    isComplete: boolean;
  }[];
  isProcessing: boolean;
  isDeductingCredits: boolean;
  isResumable: boolean;
  error?: string | null;
  onStart: () => void;
}

export default function IdleView({
  bookTitle,
  tableOfContents,
  chapters,
  isProcessing,
  isDeductingCredits,
  isResumable,
  error,
  onStart,
}: IdleViewProps) {
  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-4 tracking-tight">
          {bookTitle || "Untitled Book"}
        </h1>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
            Table of Contents
          </h3>
        </div>
        <div className="space-y-2">
          {tableOfContents.map((chapter, idx) => {
            const isFinished = chapters.some(
              (c) => c.chapterNumber === idx + 1,
            );
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-baseline gap-4 text-base p-3 rounded-lg transition-colors",
                  isFinished ? "bg-green-50" : "hover:bg-neutral-50",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-sm font-bold w-8 text-right",
                    isFinished ? "text-green-600" : "text-neutral-400",
                  )}
                >
                  {isFinished ? "✓" : `${String(idx + 1).padStart(2, "0")}.`}
                </span>
                <span
                  className={cn(
                    "font-bold",
                    isFinished ? "text-green-800" : "text-black",
                  )}
                >
                  {chapter}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={onStart}
          disabled={isProcessing}
          className={cn(
            "w-full h-16 text-lg font-bold rounded-full",
            isResumable && "bg-black hover:bg-neutral-800 text-white",
          )}
        >
          {isDeductingCredits
            ? "PROCESSING..."
            : isProcessing
            ? "PROCESSING..."
            : isResumable
            ? "RESUME GENERATION"
            : "START GENERATION"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-center">
          {error}
        </div>
      )}
    </div>
  );
}
