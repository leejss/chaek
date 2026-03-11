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
      return <CheckCircle2 className="text-neutral-900" size={20} strokeWidth={1.5} />;
    case "generating":
      return <Loader2 className="animate-spin text-neutral-400" size={20} strokeWidth={1.5} />;
    case "failed":
      return <AlertCircle className="text-red-500" size={20} strokeWidth={1.5} />;
    default:
      return <Circle className="text-neutral-200" size={20} strokeWidth={1.5} />;
  }
}

export default function GenerationView({
  bookTitle,
  bookStatus,
  tableOfContents,
  chapters,
  bookId,
}: GenerationViewProps) {
  const [status, setStatus] = useState<StatusResponse["status"]>(bookStatus);
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
    setError(data.error ?? null);
    setCurrentChapterIndex(data.currentChapterIndex);
    setCurrentSectionIndex(data.currentSectionIndex);
    setCompletedChapters(data.completedChapters);
    setChapterStatuses(data.chapters);
  }, [bookId]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== "generating" && status !== "waiting") return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, status]);

  const handleStart = async () => {
    if (isStarting || status === "generating" || status === "waiting") return;
    setIsStarting(true);
    setError(null);
    try {
      const response = await authFetch(`/api/books/${bookId}/generate`, {
        method: "POST",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "생성 작업을 대기열에 추가하지 못했습니다");
      }
      setStatus("waiting");
      await refreshStatus();
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "생성 작업을 대기열에 추가하지 못했습니다",
      );
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

  const isWorking = status === "generating" || status === "waiting";

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="mb-20 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <h1 className="font-serif text-4xl font-medium tracking-tight text-neutral-900 md:text-5xl">
            {bookTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-neutral-500">
            {isWorking && <Loader2 className="animate-spin text-neutral-400" size={14} />}
            <span className={cn("font-medium", status === "failed" ? "text-red-500" : "")}>
              {statusLabel(status)}
            </span>
            <span className="text-neutral-300">/</span>
            <span>
              {completedChapters} / {tableOfContents.length} 챕터 완료
            </span>
            {status === "generating" && currentChapterIndex && (
              <>
                <span className="text-neutral-300">/</span>
                <span>
                  챕터 {currentChapterIndex} 작성 중
                  {currentSectionIndex ? ` (섹션 ${currentSectionIndex})` : ""}
                </span>
              </>
            )}
          </div>
          {(status === "failed" || error) && (
            <p className="mt-2 text-sm text-red-500">
              {error || "생성에 실패했습니다. 다시 시도해주세요."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleStart}
            disabled={isStarting || isWorking}
            className="h-10 rounded-full px-5 text-sm font-medium"
          >
            {isStarting ? "준비 중..." : status === "failed" ? "다시 시도" : isWorking ? "작성 중" : "작성 시작"}
          </Button>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            title="새로고침"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <RefreshCw size={16} strokeWidth={2} />
            <span className="sr-only">새로고침</span>
          </button>
        </div>
      </header>

      <div className="space-y-12">
        {tableOfContents.map((title, index) => {
          const chapterNumber = index + 1;
          const chapter = chapterMap.get(chapterNumber);
          const chapterStatus = chapter?.status ?? "pending";

          return (
            <div
              key={`${chapterNumber}-${title}`}
              className={cn(
                "group flex gap-5 transition-opacity duration-300",
                chapterStatus === "pending" && "opacity-40",
              )}
            >
              <div className="mt-1.5 shrink-0">
                <StatusIcon status={chapterStatus} />
              </div>
              <div className="space-y-2.5">
                <h3
                  className={cn(
                    "text-lg font-medium tracking-tight",
                    chapterStatus === "completed" ? "text-neutral-900" : "text-neutral-700",
                  )}
                >
                  {chapterNumber}. {title}
                </h3>
                {chapter?.content && (
                  <p className="line-clamp-3 text-[15px] leading-relaxed text-neutral-500">
                    {chapter.content}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
