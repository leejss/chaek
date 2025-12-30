"use client";
import { ChevronLeft, ChevronRight, Copy, Download, Check } from "lucide-react";
import { useState } from "react";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import Button from "../../_components/Button";
import { GenerationProgress } from "@/lib/book/types";
import { useBookStore } from "@/lib/book/bookContext";
import { useSettingsStore } from "@/lib/book/settingsStore";

function getPhaseLabel(progress: GenerationProgress): string {
  switch (progress.phase) {
    case "outline":
      return "Creating chapter outline...";
    case "sections":
      return progress.currentSection && progress.totalSections
        ? `Writing section ${progress.currentSection} of ${progress.totalSections}...`
        : "Writing sections...";
    case "refinement":
      return "Refining chapter...";
    case "review":
      return "Chapter ready for review";
    default:
      return "Preparing...";
  }
}

export default function GenerationStep() {
  const chapters = useBookStore((state) => state.chapters);
  const viewingChapterIndex = useBookStore(
    (state) => state.viewingChapterIndex,
  );
  const currentChapterContent = useBookStore(
    (state) => state.currentChapterContent,
  );
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const currentChapterIndex = useBookStore(
    (state) => state.currentChapterIndex,
  );
  const generationProgress = useBookStore(
    (state) => state.generationProgress,
  ) || { phase: "idle" };
  const awaitingChapterDecision = useBookStore(
    (state) => state.awaitingChapterDecision,
  );
  const { confirmChapter, cancelGeneration, goToPrevChapter, goToNextChapter } =
    useBookStore((state) => state.actions);
  const requireConfirm = useSettingsStore((state) => state.requireConfirm);

  const [isCopied, setIsCopied] = useState(false);

  const phaseLabel = getPhaseLabel(generationProgress);
  const isReview = generationProgress.phase === "review";

  const isViewingCurrentChapter =
    currentChapterIndex !== null && viewingChapterIndex === chapters.length;

  const viewingChapter = isViewingCurrentChapter
    ? null
    : chapters[viewingChapterIndex];

  const displayContent = isViewingCurrentChapter
    ? currentChapterContent
    : viewingChapter?.content || "";

  const canGoPrev = viewingChapterIndex > 0;

  const maxViewIndex =
    currentChapterIndex !== null ? chapters.length : chapters.length - 1;
  const canGoNext = viewingChapterIndex < maxViewIndex;

  const totalPages =
    currentChapterIndex !== null ? chapters.length + 1 : chapters.length;

  const handleCopy = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleDownload = () => {
    if (!displayContent) return;

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
    const blob = new Blob([displayContent], { type: "text/markdown" });
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
    <div className="max-w-3xl mx-auto pb-32">
      {/* Header with status */}
      {isViewingCurrentChapter && (
        <div className="sticky top-0 bg-black/95 backdrop-blur py-2 border-b border-neutral-800 mb-4 z-10 flex items-center justify-center gap-2 text-brand-600">
          {!isReview && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-600 border-t-transparent"></div>
          )}
          <span className="text-sm font-medium uppercase tracking-widest">
            {phaseLabel}
          </span>
        </div>
      )}

      {/* Chapter Navigation */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between mb-4 px-2">
          <button
            onClick={goToPrevChapter}
            disabled={!canGoPrev}
            className="flex items-center gap-1 px-3 py-2 text-sm text-neutral-500 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === viewingChapterIndex
                    ? "bg-brand-600"
                    : idx < chapters.length
                    ? "bg-green-500"
                    : "bg-neutral-800"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNextChapter}
            disabled={!canGoNext}
            className="flex items-center gap-1 px-3 py-2 text-sm text-neutral-500 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Current generating chapter info */}
      {isViewingCurrentChapter &&
        tableOfContents &&
        typeof currentChapterIndex === "number" && (
          <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <div className="text-sm text-neutral-500">
              {`Chapter ${currentChapterIndex + 1} of ${
                tableOfContents.length
              }`}
            </div>
            <div className="font-serif text-lg text-white mt-1">
              {tableOfContents[currentChapterIndex]}
            </div>

            {generationProgress.currentOutline && (
              <div className="mt-3 pt-3 border-t border-neutral-800">
                <div className="text-xs text-neutral-500 mb-2">Sections:</div>
                <div className="flex flex-wrap gap-1">
                  {generationProgress.currentOutline.sections.map(
                    (section, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full ${
                          generationProgress.currentSection &&
                          idx < generationProgress.currentSection
                            ? "bg-green-900/30 text-green-400"
                            : generationProgress.currentSection === idx + 1
                            ? "bg-brand-900/30 text-brand-400"
                            : "bg-neutral-800 text-neutral-500"
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

      {/* Viewing completed chapter header */}
      {!isViewingCurrentChapter && viewingChapter && (
        <div className="mb-6 bg-green-900/10 border border-green-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-green-900/30 text-green-400 rounded-full">
              Completed
            </span>
            <span className="text-sm text-neutral-500">
              Chapter {viewingChapter.chapterNumber}
            </span>
          </div>
          <div className="font-serif text-lg text-white mt-1">
            {viewingChapter.chapterTitle}
          </div>
        </div>
      )}

      {/* Content Actions Toolbar */}
      <div className="flex justify-end gap-2 mb-2 px-2">
        <Button
          variant="ghost"
          onClick={handleCopy}
          className="px-3 py-1.5 h-auto text-xs gap-2"
        >
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          {isCopied ? "Copied" : "Copy MD"}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDownload}
          className="px-3 py-1.5 h-auto text-xs gap-2"
        >
          <Download size={14} />
          Export MD
        </Button>
      </div>

      {/* Content */}
      <div className="bg-black min-h-[500px]">
        <MarkdownRenderer
          content={displayContent}
          isStreaming={isViewingCurrentChapter && !isReview}
        />
      </div>

      {/* Fixed Bottom Action Bar */}
      {isViewingCurrentChapter && requireConfirm && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-neutral-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.5)] z-50 safe-area-bottom">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={cancelGeneration}
              className="flex-1"
              disabled={!cancelGeneration}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmChapter}
              className="flex-1"
              disabled={!awaitingChapterDecision || !confirmChapter}
            >
              Confirm Chapter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
