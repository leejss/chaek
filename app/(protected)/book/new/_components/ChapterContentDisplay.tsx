"use client";

import { useBookStore } from "@/lib/book/bookContext";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import { Loader2 } from "lucide-react";

export default function ChapterContentDisplay() {
  // Subscribe individually to minimize re-renders on unrelated state changes
  const viewingChapterIndex = useBookStore((state) => state.viewingChapterIndex);
  const currentChapterIndex = useBookStore((state) => state.currentChapterIndex);
  const chapters = useBookStore((state) => state.chapters);
  
  // Only this subscription will trigger high-frequency updates
  const currentChapterContent = useBookStore((state) => state.currentChapterContent);
  const awaitingChapterDecision = useBookStore((state) => state.awaitingChapterDecision);

  const isViewingCurrentGeneration = currentChapterIndex !== null && viewingChapterIndex === currentChapterIndex;
  
  // Determine content to display
  let contentToDisplay = "";
  let isStreaming = false;

  if (isViewingCurrentGeneration) {
    contentToDisplay = currentChapterContent;
    // Considered streaming until decision is needed or completed
    isStreaming = !awaitingChapterDecision; 
  } else if (viewingChapterIndex < chapters.length) {
    contentToDisplay = chapters[viewingChapterIndex].content;
    isStreaming = false;
  }

  // Handle empty state during initialization or transition
  if (!contentToDisplay && isViewingCurrentGeneration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-500" />
        <p>Initializing chapter generation...</p>
      </div>
    );
  }

  if (!contentToDisplay && !isViewingCurrentGeneration && viewingChapterIndex >= chapters.length) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-400">
           <p>This chapter has not been generated yet.</p>
        </div>
     )
  }

  return (
    <div className="bg-background min-h-[500px] px-4 md:px-8 py-8">
      <MarkdownRenderer
        content={contentToDisplay}
        isStreaming={isStreaming}
      />
    </div>
  );
}
