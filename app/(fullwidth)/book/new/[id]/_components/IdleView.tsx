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
    <div className="mx-auto max-w-3xl px-8 py-20 md:py-32 bg-white">
      <div className="mb-24 md:mb-32">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl md:leading-tight">
          {bookTitle}
        </h1>
        <div className="mt-12 md:mt-16">
          <Button
            variant="ghost"
            onClick={onStart}
            disabled={isProcessing}
            className="h-10 px-0 text-sm tracking-wide hover:bg-transparent hover:text-neutral-900 text-neutral-500 transition-colors"
          >
            {isDeductingCredits
              ? "처리 중..."
              : isProcessing
                ? "작성 중..."
                : isResumable
                  ? "작성 이어서 하기 ->"
                  : "작성 시작하기 ->"}
          </Button>
          {error && (
            <p className="mt-4 text-sm font-medium text-red-500">
              {error}
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-10 text-xs font-semibold tracking-wide text-neutral-400">
          목차 정보
        </h3>
        <div className="space-y-6">
          {tableOfContents.map((chapter, idx) => {
            const isFinished = chapters.some((c) => c.chapterNumber === idx + 1);
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-6 text-base transition-opacity duration-300",
                  !isFinished && "opacity-60",
                )}
              >
                <span className="w-6 shrink-0 text-left font-medium text-neutral-400">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-medium leading-relaxed",
                    isFinished ? "text-neutral-900" : "text-neutral-600",
                  )}
                >
                  {chapter}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
