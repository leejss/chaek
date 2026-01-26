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
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl text-center md:text-5xl font-bold text-black mb-4 md:mb-6">
        {bookTitle}
      </h1>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg md:text-2xl font-bold text-neutral-800 text-center mb-4">
          Table of Contents
        </h3>
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
                  isFinished ? "bg-green-50" : "",
                )}
              >
                <span
                  className={cn(
                    "text-base md:text-lg font-bold w-8 text-right",
                    isFinished ? "text-green-600" : "text-neutral-800",
                  )}
                >
                  {isFinished ? "✓" : `${String(idx + 1).padStart(2, "0")}.`}
                </span>
                <span
                  className={cn(
                    "font-bold text-lg md:text-xl",
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
            "w-full h-16 text-xl md:text-2xl font-bold rounded-full",
            isResumable && "bg-black hover:bg-neutral-800 text-white",
          )}
        >
          {isDeductingCredits
            ? "Processing..."
            : isProcessing
              ? "Processing..."
              : isResumable
                ? "Resume Writing"
                : "Start Writing"}
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
