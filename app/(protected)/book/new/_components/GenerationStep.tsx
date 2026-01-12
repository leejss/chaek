"use client";

import Button from "@/components/Button";
import {
  generationActions,
  useGenerationStore,
} from "@/context/generationContext";
import { Section } from "@/context/types/book";
import { Check } from "lucide-react";
import ChapterContentDisplay from "./ChapterContentDisplay";
import ChapterTabs from "./ChapterTabs";

export interface GenerationStepProps {
  tableOfContents: string[];
}

export default function GenerationStep({
  tableOfContents,
}: GenerationStepProps) {
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  );
  const chapters = useGenerationStore((state) => state.chapters);
  const viewingChapterIndex = useGenerationStore(
    (state) => state.viewingChapterIndex,
  );
  const currentChapterIndex = useGenerationStore(
    (state) => state.currentChapterIndex,
  );
  const awaitingChapterDecision = useGenerationStore(
    (state) => state.awaitingChapterDecision,
  );
  // const currentChapterContent = useGenerationStore(
  //   (state) => state.currentChapterContent,
  // );
  const { cancel, confirmChapter } = generationActions;
  const { currentSection, currentOutline } = generationProgress;

  const isViewingCurrentChapter =
    currentChapterIndex >= 0 && viewingChapterIndex === currentChapterIndex;

  const viewingChapter =
    viewingChapterIndex < chapters.length
      ? chapters[viewingChapterIndex]
      : null;

  // const getContentToShare = () => {
  //   if (isViewingCurrentChapter) {
  //     return currentChapterContent;
  //   } else if (viewingChapter) {
  //     return viewingChapter.content;
  //   }
  //   return "";
  // };

  // const getChapterTitle = () => {
  //   if (
  //     isViewingCurrentChapter &&
  //     tableOfContents &&
  //     currentChapterIndex >= 0
  //   ) {
  //     return tableOfContents[currentChapterIndex] || "chapter";
  //   } else if (viewingChapter) {
  //     return viewingChapter.chapterTitle;
  //   }
  //   return "chapter";
  // };

  // const handleCopy = () => {
  //   const content = getContentToShare();
  //   if (content) {
  //     copyToClipboard(content);
  //   }
  // };

  // const handleDownload = () => {
  //   const content = getContentToShare();
  //   const title = getChapterTitle();
  //   if (content) {
  //     downloadMarkdown(content, title);
  //   }
  // };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white">
      <div className="sticky top-0 z-30 bg-white">
        <ChapterTabs tableOfContents={tableOfContents} />
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 md:px-6 pb-40">
        {/* Header Section */}
        <div className="mb-8 space-y-6">
          {isViewingCurrentChapter && currentChapterIndex >= 0 && (
            <div className="bg-white p-6">
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
            <div className="bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-2 text-sm font-bold px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">
                  <Check size={14} strokeWidth={3} />
                  COMPLETED
                </span>
                <span className="text-sm font-bold text-neutral-400">
                  CHAPTER {viewingChapter.chapterNumber}
                </span>
              </div>
              <h2 className="font-sans text-3xl md:text-4xl text-black font-extrabold tracking-tight mb-8">
                {viewingChapter.chapterTitle}
              </h2>

              {viewingChapter.outline && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {viewingChapter.outline.sections.map(
                      (section: Section, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border bg-neutral-100 border-neutral-200 text-neutral-500 font-medium"
                        >
                          <Check size={14} strokeWidth={3} />
                          <span className="truncate max-w-[200px]">
                            {section.title}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Bar */}
        {/* <div className="flex items-center justify-between mb-4 px-1 border-b border-neutral-100 pb-4">
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
        </div> */}

        {/* Content Display */}
        <div className="bg-white overflow-hidden min-h-[60vh]">
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
                  onClick={cancel}
                  className="flex-1 md:flex-none md:min-w-[120px] h-12 rounded-full border-neutral-200 text-black font-bold hover:bg-neutral-100 hover:border-neutral-300"
                  disabled={!cancel}
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
