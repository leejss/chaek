"use client";

import { useGenerationStore } from "@/context/generationContext";
import { Check, Lock, Loader2, FileText } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/utils";

export interface ChapterTabsProps {
  tableOfContents: string[];
}

export default function ChapterTabs(props: ChapterTabsProps) {
  const { tableOfContents } = props;
  const viewingChapterIndex = useGenerationStore(
    (state) => state.viewingChapterIndex,
  );
  const chapters = useGenerationStore((state) => state.chapters);
  const currentChapterIndex = useGenerationStore(
    (state) => state.currentChapterIndex,
  );
  const setViewingChapterIndex = useGenerationStore(
    (state) => state.actions.setViewingChapterIndex,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active tab
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.children[
        viewingChapterIndex
      ] as HTMLElement;
      if (activeTab) {
        const container = scrollContainerRef.current;
        const scrollLeft =
          activeTab.offsetLeft -
          container.offsetWidth / 2 +
          activeTab.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [viewingChapterIndex]);

  if (!tableOfContents || tableOfContents.length === 0) return null;

  return (
    <div className="w-full bg-white">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto no-scrollbar px-4 md:px-6 gap-2 py-4 snap-x items-center"
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
                  setViewingChapterIndex(index);
                }
              }}
              disabled={isLocked}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[15px] font-bold whitespace-nowrap transition-colors duration-200 snap-center shrink-0 border",
                isActive
                  ? "bg-black border-black text-white"
                  : isLocked
                  ? "bg-transparent border-transparent text-neutral-300 cursor-not-allowed"
                  : isCurrent
                  ? "bg-white border-black text-black hover:bg-neutral-50"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 hover:bg-neutral-50",
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
                    className={`animate-spin ${
                      isActive ? "text-white" : "text-black"
                    }`}
                    strokeWidth={3}
                  />
                ) : isActive ? (
                  <FileText size={16} strokeWidth={3} />
                ) : (
                  <Lock size={16} className="text-neutral-300" />
                )}
              </div>

              <span className="truncate max-w-[180px]">
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
