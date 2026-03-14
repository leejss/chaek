"use client";

import { AlertCircle, CheckCircle2, Circle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import { authFetch } from "@/lib/api";
import { cn } from "@/utils";
import CompletedView from "./CompletedView";

export interface GenerationViewProps {
  bookTitle: string;
  bookStatus: "waiting" | "generating" | "completed" | "failed" | "cancel_requested" | "cancelled";
  initialGenerationVersion: number;
  tableOfContents: string[];
  chapters: {
    chapterNumber: number;
    chapterTitle: string;
    content: string;
    isComplete: boolean;
  }[];
  bookId: string;
}

interface StatusChapter {
  chapterNumber: number;
  title: string;
  status: "pending" | "generating" | "completed" | "failed";
  content?: string;
}

interface StatusResponse {
  ok: boolean;
  status: "waiting" | "generating" | "completed" | "failed" | "cancel_requested" | "cancelled";
  error: string | null;
  currentChapterIndex: number | null;
  currentSectionIndex: number | null;
  generationVersion: number;
  totalChapters: number;
  completedChapters: number;
  chapters: StatusChapter[];
}

function statusLabel(status: StatusResponse["status"]) {
  if (status === "generating") return "작성 중";
  if (status === "waiting") return "대기 중";
  if (status === "completed") return "완료됨";
  if (status === "failed") return "실패";
  if (status === "cancel_requested") return "취소 요청됨";
  return "취소됨";
}

function StatusIcon({ status }: { status: StatusChapter["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="text-neutral-400" size={18} strokeWidth={1.5} />;
    case "generating":
      return <Loader2 className="animate-spin text-neutral-400" size={18} strokeWidth={1.5} />;
    case "failed":
      return <AlertCircle className="text-neutral-400" size={18} strokeWidth={1.5} />;
    default:
      return <Circle className="text-neutral-200" size={18} strokeWidth={1} />;
  }
}

export default function GenerationView({
  bookTitle,
  bookStatus,
  initialGenerationVersion,
  tableOfContents,
  chapters,
  bookId,
}: GenerationViewProps) {
  const [status, setStatus] = useState<StatusResponse["status"]>(bookStatus);
  const [generationVersion, setGenerationVersion] = useState(initialGenerationVersion);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number | null>(null);
  const [completedChapters, setCompletedChapters] = useState(
    chapters.filter((c) => c.isComplete).length,
  );
  const [chapterStatuses, setChapterStatuses] = useState<StatusChapter[]>(
    chapters.map((chapter) => ({
      chapterNumber: chapter.chapterNumber,
      title: chapter.chapterTitle,
      status: chapter.isComplete ? "completed" : "generating",
      content: chapter.content,
    })),
  );

  const refreshStatus = useCallback(async () => {
    const response = await authFetch(`/api/books/${bookId}/status`);
    if (!response.ok) return;

    const data = (await response.json()) as StatusResponse;
    if (!data.ok) return;

    setStatus(data.status);
    setGenerationVersion(data.generationVersion);
    setError(data.error ?? null);
    setCurrentChapterIndex(data.currentChapterIndex);
    setCurrentSectionIndex(data.currentSectionIndex);
    setCompletedChapters(data.completedChapters);
    setChapterStatuses(data.chapters);
  }, [bookId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== "generating" && status !== "waiting") return;
    const timer = window.setInterval(() => {
      refreshStatus();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, status]);

  const isInitialWaitingState = generationVersion === 1 && completedChapters === 0;
  const isWorking = (status === "generating" || status === "waiting") && !isInitialWaitingState;

  const handleStart = async () => {
    if (isStarting || isWorking) return;
    setIsStarting(true);
    setError(null);
    try {
      const response = await authFetch(`/api/books/${bookId}/generate`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        generationVersion?: number;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "작업을 시작하지 못했습니다.");
      }
      setStatus("waiting");
      setGenerationVersion(data.generationVersion ?? generationVersion);
      await refreshStatus();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "작업을 시작하지 못했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  const chapterMap = useMemo(() => {
    const map = new Map<number, StatusChapter>();
    for (const chapter of chapterStatuses) {
      map.set(chapter.chapterNumber, chapter);
    }
    return map;
  }, [chapterStatuses]);

  if (status === "completed") {
    return <CompletedView bookTitle={bookTitle} bookId={bookId} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-20 md:py-32 bg-white">
      <header className="mb-24 md:mb-32 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-wide text-neutral-400">
              {statusLabel(status)}
            </span>
            {isWorking && <Loader2 className="animate-spin text-neutral-300" size={14} />}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl md:leading-tight">
            {bookTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <span>
              {completedChapters} / {tableOfContents.length} 챕터 완료됨
            </span>
            {status === "generating" && currentChapterIndex && (
              <>
                <span className="text-neutral-300">•</span>
                <span>
                  {currentChapterIndex} 챕터 작성 중
                  {currentSectionIndex ? ` (${currentSectionIndex} 구간)` : ""}
                </span>
              </>
            )}
          </div>
          {(status === "failed" || error) && (
            <p className="text-sm text-red-500">
              {error || "생성에 실패했습니다. 다시 시도해 주세요."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 md:mt-2">
          <Button
            variant="ghost"
            onClick={handleStart}
            disabled={isStarting || isWorking}
            className="h-9 px-4 text-xs tracking-wide"
          >
            {isStarting
              ? "준비 중..."
              : status === "failed"
                ? "다시 시도"
                : isWorking
                  ? "작성 중"
                  : "작성 시작"}
          </Button>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            title="새로고침"
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            <RefreshCw size={14} strokeWidth={2} />
            <span className="sr-only">새로고침</span>
          </button>
        </div>
      </header>

      <div className="space-y-16">
        {tableOfContents.map((title, index) => {
          const chapterNumber = index + 1;
          const chapter = chapterMap.get(chapterNumber);
          const chapterStatus = chapter?.status ?? "pending";
          const isActive = chapterStatus === "generating";

          return (
            <div
              key={`${chapterNumber}-${title}`}
              className={cn(
                "group flex gap-6 transition-opacity duration-500",
                chapterStatus === "pending" && "opacity-30",
              )}
            >
              <div className="mt-1 shrink-0">
                <StatusIcon status={chapterStatus} />
              </div>
              <div className="space-y-3 flex-1">
                <h3
                  className={cn(
                    "text-lg font-medium tracking-tight",
                    isActive || chapterStatus === "completed"
                      ? "text-neutral-900"
                      : "text-neutral-600",
                  )}
                >
                  {String(chapterNumber).padStart(2, "0")}. {title}
                </h3>
                {chapter?.content && (
                  <div className="relative">
                    <p className="line-clamp-4 text-[15px] leading-relaxed text-neutral-500">
                      {chapter.content}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
