"use client";

import { useGenerationStore } from "@/lib/book/generationContext";
import { Check, Lock, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ChapterTabs() {
  const tableOfContents = useGenerationStore((state) => state.tableOfContents);
  const viewingChapterIndex = useGenerationStore((state) => state.viewingChapterIndex);
  const chapters = useGenerationStore((state) => state.chapters);
  const currentChapterIndex = useGenerationStore((state) => state.currentChapterIndex);
  const setViewingChapterIndex = useGenerationStore(
    (state) => state.actions.setViewingChapterIndex,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active tab
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.children[viewingChapterIndex] as HTMLElement;
      if (activeTab) {
        const container = scrollContainerRef.current;
        const scrollLeft = activeTab.offsetLeft - container.offsetWidth / 2 + activeTab.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [viewingChapterIndex]);

  if (!tableOfContents || tableOfContents.length === 0) return null;

  return (
    <div className="w-full border-b border-neutral-200 bg-white sticky top-0 z-20">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto no-scrollbar px-4 gap-2 py-3 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                  setViewingChapterIndex(index);
                }
              }}
              disabled={isLocked}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all snap-center border
                ${isActive
                  ? "bg-brand-50 border-brand-200 text-brand-700 shadow-sm ring-1 ring-brand-100"
                  : isLocked
                    ? "bg-neutral-50 border-transparent text-neutral-400 cursor-not-allowed"
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600"
                }
              `}
            >
              {isCompleted ? (
                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${isActive ? "bg-brand-100 text-brand-600" : "bg-green-100 text-green-600"}`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : isCurrent ? (
                <span className="flex items-center justify-center w-5 h-5">
                   <Loader2 size={14} className="animate-spin text-brand-500" />
                </span>
              ) : (
                <span className="flex items-center justify-center w-5 h-5 text-neutral-300">
                  <Lock size={12} />
                </span>
              )}

              <span className="truncate max-w-[150px]">
                {index + 1}. {title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scroll Fade Indicators (Optional visual enhancement) */}
      <div className="absolute top-0 left-0 w-4 h-full bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
}
