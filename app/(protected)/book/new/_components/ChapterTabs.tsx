"use client";

import { Check, FileText, Loader2, Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import { generationActions, useGenerationStore } from "@/context/generationContext";
import { cn } from "@/utils";

export interface ChapterTabsProps {
  tableOfContents: string[];
}

export default function ChapterTabs({ tableOfContents }: ChapterTabsProps) {
  const viewingChapterIndex = useGenerationStore((state) => state.viewingChapterIndex);
  const chapters = useGenerationStore((state) => state.chapters);
  const currentChapterIndex = useGenerationStore((state) => state.currentChapterIndex);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active tab
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.children[viewingChapterIndex] as HTMLElement;
      if (activeTab) {
        const container = scrollContainerRef.current;
        const scrollLeft =
          activeTab.offsetLeft - container.offsetWidth / 2 + activeTab.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [viewingChapterIndex]);

  if (!tableOfContents || tableOfContents.length === 0) return null;

  return (
    <div className="w-full bg-white">
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex snap-x items-center gap-2 overflow-x-auto px-4 py-4 md:px-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {tableOfContents.map((title, index) => {
          // Chapter State Logic
          const isCompleted = index < chapters.length;
          const isCurrent = currentChapterIndex === index;
          const isLocked = !isCompleted && !isCurrent;
          const isActive = viewingChapterIndex === index;

          return (
            <button
              key={index}
              onClick={() => {
                if (!isLocked) {
                  generationActions.setViewingChapterIndex(index);
                }
              }}
              disabled={isLocked}
              className={cn(
                "relative flex shrink-0 snap-center items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 font-bold text-[15px] transition-colors duration-200",
                isActive
                  ? "border-black bg-black text-white"
                  : isLocked
                    ? "cursor-not-allowed border-transparent bg-transparent text-neutral-300"
                    : isCurrent
                      ? "border-black bg-white text-black hover:bg-neutral-50"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900",
              )}
            >
              <div className="flex items-center justify-center">
                {isCompleted ? (
                  <Check
                    size={16}
                    strokeWidth={3}
                    className={isActive ? "text-white" : "text-green-600"}
                  />
                ) : isCurrent ? (
                  <Loader2
                    size={16}
                    className={`animate-spin ${isActive ? "text-white" : "text-black"}`}
                    strokeWidth={3}
                  />
                ) : isActive ? (
                  <FileText size={16} strokeWidth={3} />
                ) : (
                  <Lock size={16} className="text-neutral-300" />
                )}
              </div>

              <span className="max-w-[180px] truncate">
                <span>{index + 1}.</span>
                {title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
