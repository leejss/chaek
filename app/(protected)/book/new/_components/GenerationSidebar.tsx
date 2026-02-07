"use client";

import { Check, ChevronRight, FileText, Loader2, Lock } from "lucide-react";
import { generationActions, useGenerationStore } from "@/context/generationContext";
import { cn } from "@/utils";

interface GenerationSidebarProps {
  tableOfContents: string[];
}

export default function GenerationSidebar({ tableOfContents }: GenerationSidebarProps) {
  const viewingChapterIndex = useGenerationStore((state) => state.viewingChapterIndex);
  const currentChapterIndex = useGenerationStore((state) => state.currentChapterIndex);
  const chapters = useGenerationStore((state) => state.chapters);

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-neutral-200 border-r bg-white">
      <div className="border-neutral-100 border-b bg-neutral-50/30 p-6">
        <h2 className="mb-1 font-bold text-neutral-500 text-xs uppercase tracking-widest">
          Contents
        </h2>
        <p className="font-medium text-neutral-400 text-sm">
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
                "group flex w-full items-center gap-3 border-l-2 px-5 py-3.5 text-left transition-all duration-200",
                isActive ? "border-black bg-neutral-50" : "border-transparent hover:bg-neutral-50",
                isLocked && "cursor-not-allowed opacity-50 hover:bg-transparent",
              )}
            >
              <div className="flex shrink-0 items-center justify-center">
                {isCompleted ? (
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-green-600 text-white" : "bg-green-100 text-green-700",
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

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "mb-0.5 font-bold text-xs",
                    isActive ? "text-neutral-900" : "text-neutral-500",
                  )}
                >
                  CHAPTER {index + 1}
                </p>
                <p
                  className={cn(
                    "truncate font-medium text-sm",
                    isActive ? "text-black" : "text-neutral-600",
                    isCompleted && "text-neutral-900",
                  )}
                >
                  {title}
                </p>
              </div>

              {isActive && <ChevronRight size={16} className="text-neutral-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
