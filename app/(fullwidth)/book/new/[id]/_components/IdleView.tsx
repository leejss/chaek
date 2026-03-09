"use client";

import Button from "@/components/Button";
import { cn } from "@/utils";

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
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-center font-bold text-4xl text-black md:mb-6 md:text-5xl">
        {bookTitle}
      </h1>

      <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-center font-bold text-lg text-neutral-800 md:text-2xl">
          목차
        </h3>
        <div className="space-y-2">
          {tableOfContents.map((chapter, idx) => {
            const isFinished = chapters.some((c) => c.chapterNumber === idx + 1);
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-baseline gap-4 rounded-lg p-3 text-base transition-colors",
                  isFinished ? "bg-green-50" : "",
                )}
              >
                <span
                  className={cn(
                    "w-8 text-right font-bold text-base md:text-lg",
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
            "h-16 w-full rounded-full font-bold text-xl md:text-2xl",
            isResumable && "bg-black text-white hover:bg-neutral-800",
          )}
        >
          {isDeductingCredits
            ? "처리 중..."
            : isProcessing
              ? "처리 중..."
              : isResumable
                ? "이어서 작성하기"
                : "작성 시작하기"}
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
