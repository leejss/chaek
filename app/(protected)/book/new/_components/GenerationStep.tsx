"use client";
import { ChevronLeft, ChevronRight, Copy, Download, Check } from "lucide-react";
import { useState } from "react";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import Button from "../../_components/Button";
import { GenerationProgress } from "@/lib/book/types";
import { useBookStore } from "@/lib/book/bookContext";

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
        <div className="sticky top-0 bg-white/95 backdrop-blur py-2 border-b border-brand-100 mb-4 z-10 flex items-center justify-center gap-2 text-brand-700">
          {!isReview && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-700 border-t-transparent"></div>
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
            className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    ? "bg-brand-700"
                    : idx < chapters.length
                    ? "bg-green-400"
                    : "bg-stone-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNextChapter}
            disabled={!canGoNext}
            className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          <div className="mb-6 bg-stone-50 border border-stone-200 rounded p-4">
            <div className="text-sm text-stone-600">
              {`Chapter ${currentChapterIndex + 1} of ${
                tableOfContents.length
              }`}
            </div>
            <div className="font-serif text-lg text-ink-900 mt-1">
              {tableOfContents[currentChapterIndex]}
            </div>

            {generationProgress.currentOutline && (
              <div className="mt-3 pt-3 border-t border-stone-200">
                <div className="text-xs text-stone-500 mb-2">Sections:</div>
                <div className="flex flex-wrap gap-1">
                  {generationProgress.currentOutline.sections.map(
                    (section, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded ${
                          generationProgress.currentSection &&
                          idx < generationProgress.currentSection
                            ? "bg-green-100 text-green-700"
                            : generationProgress.currentSection === idx + 1
                            ? "bg-brand-100 text-brand-700"
                            : "bg-stone-100 text-stone-500"
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
        <div className="mb-6 bg-green-50 border border-green-200 rounded p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
              Completed
            </span>
            <span className="text-sm text-stone-600">
              Chapter {viewingChapter.chapterNumber}
            </span>
          </div>
          <div className="font-serif text-lg text-ink-900 mt-1">
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
      <div className="bg-white min-h-[500px]">
        <MarkdownRenderer
          content={displayContent}
          isStreaming={isViewingCurrentChapter && !isReview}
        />
      </div>

      {/* Fixed Bottom Action Bar */}
      {isViewingCurrentChapter && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 safe-area-bottom">
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
