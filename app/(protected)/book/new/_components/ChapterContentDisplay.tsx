"use client";

import { useGenerationStore } from "@/context/generationContext";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import { Loader2 } from "lucide-react";

export default function ChapterContentDisplay() {
  const viewingChapterIndex = useGenerationStore(
    (state) => state.viewingChapterIndex,
  );
  const currentChapterIndex = useGenerationStore(
    (state) => state.currentChapterIndex,
  );
  const chapters = useGenerationStore((state) => state.chapters);
  const currentChapterContent = useGenerationStore(
    (state) => state.currentChapterContent,
  );
  const awaitingChapterDecision = useGenerationStore(
    (state) => state.awaitingChapterDecision,
  );

  const isViewingCurrentGeneration =
    currentChapterIndex !== null && viewingChapterIndex === currentChapterIndex;

  let contentToDisplay = "";
  let isStreaming = false;

  if (isViewingCurrentGeneration) {
    contentToDisplay = currentChapterContent;
    isStreaming = !awaitingChapterDecision;
  } else if (viewingChapterIndex < chapters.length) {
    contentToDisplay = chapters[viewingChapterIndex].content;
    isStreaming = false;
  }

  if (!contentToDisplay && isViewingCurrentGeneration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-black" />
        <p>Initializing chapter generation...</p>
      </div>
    );
  }

  if (
    !contentToDisplay &&
    !isViewingCurrentGeneration &&
    viewingChapterIndex >= chapters.length
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-400">
        <p>This chapter has not been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[500px] px-4 md:px-8 py-8">
      <MarkdownRenderer content={contentToDisplay} isStreaming={isStreaming} />
    </div>
  );
}
