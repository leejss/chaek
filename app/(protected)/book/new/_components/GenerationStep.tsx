"use client";

import { Copy, Download, Check } from "lucide-react";
import { useState } from "react";
import Button from "../../_components/Button";
import { ChapterOutline, Section } from "@/lib/book/types";
import { bookStoreActions, useBookStore } from "@/lib/book/bookContext";
import { useSettingsStore } from "@/lib/book/settingsStore";
import ChapterTabs from "./ChapterTabs";
import ChapterContentDisplay from "./ChapterContentDisplay";

interface GenerationStepProps {
  phase?: string;
  currentChapter?: number;
  totalChapters?: number;
  currentSection?: number;
  totalSections?: number;
  currentOutline?: ChapterOutline | null;
}

function getPhaseLabel(
  phase: string,
  currentSection?: number,
  totalSections?: number,
): string {
  switch (phase) {
    case "planning":
      return "작성 계획 수립중...";
    case "outlining":
      return "챕터 개요 생성중...";
    case "generating_sections":
      if (currentSection && totalSections) {
        return `섹션 ${currentSection} / ${totalSections} 작성중...`;
      }
      return "섹션 작성중...";
    default:
      return "준비중...";
  }
}

export default function GenerationStep(props: GenerationStepProps) {
  const {
    phase: propsPhase,
    currentSection: propsCurrentSection,
    totalSections: propsTotalSections,
    currentOutline: propsCurrentOutline,
  } = props;

  const generationProgress = useBookStore(
    (state) => state.generationProgress || { phase: "idle" },
  );

  const phase = propsPhase ?? generationProgress.phase;
  const currentSection =
    propsCurrentSection ?? generationProgress.currentSection;
  const totalSections = propsTotalSections ?? generationProgress.totalSections;
  const currentOutline =
    propsCurrentOutline ?? generationProgress.currentOutline;

  const chapters = useBookStore((state) => state.chapters);
  const viewingChapterIndex = useBookStore(
    (state) => state.viewingChapterIndex,
  );
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const currentChapterIndex = useBookStore(
    (state) => state.currentChapterIndex,
  );
  const awaitingChapterDecision = useBookStore(
    (state) => state.awaitingChapterDecision,
  );

  const requireConfirm = useSettingsStore((state) => state.requireConfirm);

  const [isCopied, setIsCopied] = useState(false);

  const phaseLabel = getPhaseLabel(phase, currentSection, totalSections);
  const isReview = phase === "review";
  const isCompleted = phase === "completed";

  const isViewingCurrentChapter =
    currentChapterIndex !== null && viewingChapterIndex === currentChapterIndex;

  const viewingChapter =
    viewingChapterIndex < chapters.length
      ? chapters[viewingChapterIndex]
      : null;

  const handleCopy = async () => {
    let contentToCopy = "";
    if (isViewingCurrentChapter) {
      contentToCopy = useBookStore.getState().currentChapterContent;
    } else if (viewingChapter) {
      contentToCopy = viewingChapter.content;
    }

    if (!contentToCopy) return;
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleDownload = () => {
    let contentToDownload = "";
    if (isViewingCurrentChapter) {
      contentToDownload = useBookStore.getState().currentChapterContent;
    } else if (viewingChapter) {
      contentToDownload = viewingChapter.content;
    }

    if (!contentToDownload) return;

    let title = "chapter";
    if (
      isViewingCurrentChapter &&
      tableOfContents &&
      typeof currentChapterIndex === "number"
    ) {
      title = tableOfContents[currentChapterIndex];
    } else if (viewingChapter) {
      title = viewingChapter.chapterTitle;
    }

    const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    const blob = new Blob([contentToDownload], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full pb-32">
      {/* Sticky Header with Status and Tabs */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-20 border-b border-neutral-200 shadow-sm">
        {isViewingCurrentChapter && (
          <div className="py-2 bg-brand-50/50 border-b border-brand-100 flex items-center justify-center gap-2 text-brand-700">
            {!isReview && !isCompleted && (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-brand-600 border-t-transparent"></div>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {phaseLabel}
            </span>
          </div>
        )}
        <ChapterTabs />
      </div>

      <div className="max-w-3xl mx-auto pt-6 px-4">
        {/* Chapter Info Card */}
        {isViewingCurrentChapter &&
          tableOfContents &&
          typeof currentChapterIndex === "number" && (
            <div className="mb-6 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">
                  Writing Now
                </span>
                <span className="text-sm text-neutral-500">
                  Chapter {currentChapterIndex + 1} of {tableOfContents.length}
                </span>
              </div>

              <div className="font-serif text-xl md:text-2xl text-foreground font-medium">
                {tableOfContents[currentChapterIndex]}
              </div>

              {currentOutline && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">
                    Sections
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentOutline.sections.map(
                      (section: Section, idx: number) => (
                        <span
                          key={idx}
                          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                            currentSection && idx < currentSection
                              ? "bg-green-100 text-green-700 font-medium"
                              : currentSection === idx + 1
                              ? "bg-brand-600 text-white font-medium shadow-sm"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {section.title}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        {!isViewingCurrentChapter && viewingChapter && (
          <div className="mb-6 bg-green-50/50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                <Check size={10} strokeWidth={3} />
                Completed
              </span>
              <span className="text-sm text-neutral-500">
                Chapter {viewingChapter.chapterNumber}
              </span>
            </div>
            <div className="font-serif text-xl md:text-2xl text-foreground font-medium">
              {viewingChapter.chapterTitle}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={handleCopy}
            className="h-8 px-3 text-xs gap-1.5 text-neutral-500 hover:text-brand-600 hover:bg-brand-50"
          >
            {isCopied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} />
            )}
            {isCopied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDownload}
            className="h-8 px-3 text-xs gap-1.5 text-neutral-500 hover:text-brand-600 hover:bg-brand-50"
          >
            <Download size={14} />
            Export MD
          </Button>
        </div>

        {/* Content Display (Isolated for Performance) */}
        <div className="rounded-xl border border-neutral-100 shadow-sm overflow-hidden bg-white">
          <ChapterContentDisplay />
        </div>
      </div>

      {/* Confirmation Footer */}
      {isViewingCurrentChapter && awaitingChapterDecision && requireConfirm && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-bottom">
          <div className="max-w-xl mx-auto flex gap-3 animate-in slide-in-from-bottom-4 duration-300">
            <Button
              variant="outline"
              onClick={bookStoreActions.cancelGeneration}
              className="flex-1 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              disabled={!bookStoreActions.cancelGeneration}
            >
              Cancel
            </Button>
            <Button
              onClick={bookStoreActions.confirmChapter}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg transition-all"
              disabled={
                !awaitingChapterDecision || !bookStoreActions.confirmChapter
              }
            >
              Confirm & Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
