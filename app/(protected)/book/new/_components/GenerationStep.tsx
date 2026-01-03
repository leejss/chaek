"use client";

import { useGenerationStore } from "@/lib/book/generationContext";
import { Section } from "@/lib/book/types";
import { Check, Copy, Download, Loader2, BookOpen } from "lucide-react";
import { useState } from "react";
import Button from "../../_components/Button";
import ChapterContentDisplay from "./ChapterContentDisplay";
import ChapterTabs from "./ChapterTabs";

export default function GenerationStep() {
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  ) || { phase: "idle" };
  const chapters = useGenerationStore((state) => state.chapters);
  const viewingChapterIndex = useGenerationStore(
    (state) => state.viewingChapterIndex,
  );
  const tableOfContents = useGenerationStore((state) => state.tableOfContents);
  const currentChapterIndex = useGenerationStore(
    (state) => state.currentChapterIndex,
  );
  const awaitingChapterDecision = useGenerationStore(
    (state) => state.awaitingChapterDecision,
  );
  const currentChapterContent = useGenerationStore(
    (state) => state.currentChapterContent,
  );
  const cancelGeneration = useGenerationStore(
    (state) => state.actions.cancelGeneration,
  );
  const confirmChapter = useGenerationStore(
    (state) => state.actions.confirmChapter,
  );

  const { currentSection, currentOutline } = generationProgress;

  const [isCopied, setIsCopied] = useState(false);

  const isViewingCurrentChapter =
    currentChapterIndex !== null && viewingChapterIndex === currentChapterIndex;

  const viewingChapter =
    viewingChapterIndex < chapters.length
      ? chapters[viewingChapterIndex]
      : null;

  const handleCopy = async () => {
    let contentToCopy = "";
    if (isViewingCurrentChapter) {
      contentToCopy = currentChapterContent;
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
      contentToDownload = currentChapterContent;
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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white">
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-100">
        <ChapterTabs />
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 md:px-6 pb-40">
        {/* Header Section */}
        <div className="mb-8 space-y-6">
          {isViewingCurrentChapter &&
            tableOfContents &&
            typeof currentChapterIndex === "number" && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-2 text-sm font-bold px-3 py-1 bg-black text-white rounded-full">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    WRITING NOW
                  </span>
                  <span className="text-sm font-bold text-neutral-500">
                    CHAPTER {currentChapterIndex + 1} / {tableOfContents.length}
                  </span>
                </div>

                <h2 className="font-sans text-3xl md:text-4xl text-black font-extrabold mb-8 tracking-tight">
                  {tableOfContents[currentChapterIndex]}
                </h2>

                {currentOutline && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {currentOutline.sections.map(
                        (section: Section, idx: number) => {
                          const isActive = currentSection === idx + 1;
                          const isPast = currentSection && idx < currentSection;

                          return (
                            <div
                              key={idx}
                              className={`
                                flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border
                                ${
                                  isPast
                                    ? "bg-neutral-100 border-neutral-200 text-neutral-500 font-medium"
                                    : isActive
                                    ? "bg-white border-black text-black font-bold ring-1 ring-black"
                                    : "bg-white border-neutral-200 text-neutral-400"
                                }
                              `}
                            >
                              {isPast ? (
                                <Check size={14} strokeWidth={3} />
                              ) : null}
                              <span className="truncate max-w-[200px]">
                                {section.title}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          {!isViewingCurrentChapter && viewingChapter && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-2 text-sm font-bold px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">
                  <Check size={14} strokeWidth={3} />
                  COMPLETED
                </span>
                <span className="text-sm font-bold text-neutral-400">
                  CHAPTER {viewingChapter.chapterNumber}
                </span>
              </div>
              <h2 className="font-sans text-3xl md:text-4xl text-black font-extrabold tracking-tight">
                {viewingChapter.chapterTitle}
              </h2>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4 px-1 border-b border-neutral-100 pb-4">
          <div className="text-sm text-black font-bold flex items-center gap-2">
            <BookOpen size={18} strokeWidth={2.5} />
            <span>MARKDOWN PREVIEW</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleCopy}
              className={`
                h-9 px-4 text-xs font-bold gap-2 rounded-full transition-colors
                ${
                  isCopied
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
                }
              `}
            >
              {isCopied ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <Copy size={14} strokeWidth={3} />
              )}
              {isCopied ? "COPIED" : "COPY"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDownload}
              className="h-9 px-4 text-xs font-bold gap-2 bg-neutral-100 text-black hover:bg-neutral-200 rounded-full"
            >
              <Download size={14} strokeWidth={3} />
              EXPORT
            </Button>
          </div>
        </div>

        {/* Content Display */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden min-h-[60vh]">
          <ChapterContentDisplay />
        </div>
      </div>

      {/* Confirmation Floating Bar */}
      {isViewingCurrentChapter && awaitingChapterDecision && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-white border-t border-neutral-200 px-4 py-4 md:py-6 safe-area-bottom">
            <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center gap-4">
              <div className="text-sm text-black font-bold hidden md:block">
                REVIEW CHAPTER GENERATION
              </div>
              <div className="flex w-full md:w-auto flex-1 gap-3 md:ml-auto">
                <Button
                  variant="outline"
                  onClick={cancelGeneration}
                  className="flex-1 md:flex-none md:min-w-[120px] h-12 rounded-full border-neutral-200 text-black font-bold hover:bg-neutral-100 hover:border-neutral-300"
                  disabled={!cancelGeneration}
                >
                  DISCARD
                </Button>
                <Button
                  onClick={confirmChapter}
                  className="flex-1 md:flex-none md:min-w-[200px] h-12 rounded-full bg-black text-white font-bold hover:bg-neutral-800 border-none shadow-none"
                  disabled={!awaitingChapterDecision || !confirmChapter}
                >
                  CONFIRM & CONTINUE
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
