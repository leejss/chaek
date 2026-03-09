"use client";

import { RefreshCw } from "lucide-react";
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
  if (status === "generating") return "백그라운드에서 생성 중";
  if (status === "waiting") return "대기 중";
  if (status === "completed") return "완료됨";
  if (status === "failed") return "실패";
  if (status === "cancel_requested") return "취소 요청됨";
  return "취소됨";
}

function chapterStatusLabel(status: StatusChapter["status"]) {
  if (status === "completed") return "완료";
  if (status === "generating") return "생성 중";
  if (status === "failed") return "실패";
  return "대기";
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
      const response = await authFetch(`/api/books/${bookId}/generate`, { method: "POST" });
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="space-y-3 text-center">
        <h1 className="font-bold text-4xl text-black">{bookTitle}</h1>
        <p className="font-medium text-neutral-500">
          {statusLabel(status)} · {completedChapters}/{tableOfContents.length}개 챕터
        </p>
        {status === "generating" && (
          <p className="font-medium text-neutral-500 text-sm">
            현재 진행: 챕터 {currentChapterIndex ?? "-"} / 섹션 {currentSectionIndex ?? "-"}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-black">백그라운드 생성 상태</h2>
          <span
            className={cn("rounded-full px-3 py-1 font-bold text-xs", {
              "bg-amber-100 text-amber-700": status === "generating" || status === "waiting",
              "bg-red-100 text-red-700": status === "failed",
              "bg-neutral-200 text-neutral-700":
                status === "cancelled" || status === "cancel_requested",
            })}
          >
            {statusLabel(status)}
          </span>
        </div>

        {(status === "failed" || error) && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 font-medium text-red-700 text-sm">
            {error || "생성에 실패했습니다"}
          </div>
        )}

        <div className="mb-4 flex gap-3">
          <Button
            onClick={handleStart}
            disabled={isStarting || status === "generating" || status === "waiting"}
            className="h-12 rounded-full px-6 font-bold"
          >
            {isStarting ? "대기열에 추가하는 중..." : status === "failed" ? "다시 시도" : "시작 / 이어쓰기"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void refreshStatus()}
            className="h-12 rounded-full px-5 font-bold"
          >
            <RefreshCw size={14} className="mr-2" />
            새로고침
          </Button>
        </div>

        <p className="font-medium text-neutral-500 text-sm">
          이제 생성은 백그라운드에서 진행됩니다. 이 탭을 닫아도 작업은 중단되지 않습니다.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-bold text-black">챕터</h2>
        {tableOfContents.map((title, index) => {
          const chapterNumber = index + 1;
          const chapter = chapterMap.get(chapterNumber);
          const chapterStatus = chapter?.status ?? "pending";

          return (
            <div
              key={`${chapterNumber}-${title}`}
              className={cn("rounded-lg border p-3", {
                "border-green-200 bg-green-50": chapterStatus === "completed",
                "border-amber-200 bg-amber-50": chapterStatus === "generating",
                "border-red-200 bg-red-50": chapterStatus === "failed",
                "border-neutral-200 bg-neutral-50": chapterStatus === "pending",
              })}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-black">
                  {chapterNumber}. {title}
                </p>
                <span className="font-semibold text-xs">{chapterStatusLabel(chapterStatus)}</span>
              </div>
              {chapter?.content && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-neutral-700 text-sm">
                  {chapter.content}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
