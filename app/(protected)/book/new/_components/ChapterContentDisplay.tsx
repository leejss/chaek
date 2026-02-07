"use client";

import { Loader2 } from "lucide-react";
import { useGenerationStore } from "@/context/generationContext";
import MarkdownRenderer from "../../_components/MarkdownRenderer";

export default function ChapterContentDisplay() {
  const viewingChapterIndex = useGenerationStore((state) => state.viewingChapterIndex);
  const currentChapterIndex = useGenerationStore((state) => state.currentChapterIndex);
  const chapters = useGenerationStore((state) => state.chapters);
  const currentChapterContent = useGenerationStore((state) => state.currentChapterContent);
  const awaitingChapterDecision = useGenerationStore((state) => state.awaitingChapterDecision);

  const isViewingCurrentGeneration =
    currentChapterIndex >= 0 && viewingChapterIndex === currentChapterIndex;

  let contentToDisplay = "";
  let isStreaming = false;

  if (isViewingCurrentGeneration) {
    contentToDisplay = currentChapterContent;
    isStreaming = !awaitingChapterDecision;
  } else if (viewingChapterIndex < chapters.length) {
    const chapter = chapters[viewingChapterIndex];
    if (chapter) {
      contentToDisplay = chapter.content;
    }
    isStreaming = false;
  }

  if (!contentToDisplay && isViewingCurrentGeneration) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-neutral-400">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-black" />
        <p>Initializing chapter generation...</p>
      </div>
    );
  }

  if (!contentToDisplay && !isViewingCurrentGeneration && viewingChapterIndex >= chapters.length) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-neutral-400">
        <p>This chapter has not been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[500px] bg-background px-4 py-8 md:px-8">
      <MarkdownRenderer content={contentToDisplay} isStreaming={isStreaming} />
    </div>
  );
}
