"use client";

import {
  useGenerationStore,
  generationActions,
} from "@/context/generationContext";
import { cn } from "@/utils";
import { Check, FileText, Loader2, Lock, ChevronRight } from "lucide-react";

interface GenerationSidebarProps {
  tableOfContents: string[];
}

export default function GenerationSidebar({
  tableOfContents,
}: GenerationSidebarProps) {
  const viewingChapterIndex = useGenerationStore(
    (state) => state.viewingChapterIndex,
  );
  const currentChapterIndex = useGenerationStore(
    (state) => state.currentChapterIndex,
  );
  const chapters = useGenerationStore((state) => state.chapters);

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200 w-80 shrink-0">
      <div className="p-6 border-b border-neutral-100 bg-neutral-50/30">
        <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
          Contents
        </h2>
        <p className="text-sm font-medium text-neutral-400">
          {chapters.length} / {tableOfContents.length} generated
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {tableOfContents.map((title, index) => {
          const isCompleted = index < chapters.length;
          const isCurrent = currentChapterIndex === index;
          const isLocked = !isCompleted && !isCurrent;
          const isActive = viewingChapterIndex === index;

          return (
            <button
              key={index}
              disabled={isLocked}
              onClick={() => generationActions.setViewingChapterIndex(index)}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all duration-200 group border-l-2",
                isActive
                  ? "bg-neutral-50 border-black"
                  : "border-transparent hover:bg-neutral-50",
                isLocked &&
                  "cursor-not-allowed opacity-50 hover:bg-transparent",
              )}
            >
              <div className="flex items-center justify-center shrink-0">
                {isCompleted ? (
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-green-600 text-white"
                        : "bg-green-100 text-green-700",
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : isCurrent ? (
                  <Loader2 size={20} className="animate-spin text-black" />
                ) : isActive ? (
                  <FileText size={20} className="text-black" />
                ) : (
                  <Lock size={18} className="text-neutral-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs font-bold mb-0.5",
                    isActive ? "text-neutral-900" : "text-neutral-500",
                  )}
                >
                  CHAPTER {index + 1}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-black" : "text-neutral-600",
                    isCompleted && "text-neutral-900",
                  )}
                >
                  {title}
                </p>
              </div>

              {isActive && (
                <ChevronRight size={16} className="text-neutral-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
