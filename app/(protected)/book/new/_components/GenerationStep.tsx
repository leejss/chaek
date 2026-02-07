"use client";

import { Check } from "lucide-react";
import Button from "@/components/Button";
import { generationActions, useGenerationStore } from "@/context/generationContext";
import type { BookGenerationSettings } from "@/lib/ai/schemas/settings";
import ChapterContentDisplay from "./ChapterContentDisplay";
import ChapterTabs from "./ChapterTabs";
import GenerationSidebar from "./GenerationSidebar";

export interface GenerationStepProps {
  tableOfContents: string[];
  bookTitle?: string;
  sourceText?: string;
  generationSettings?: BookGenerationSettings;
}

export default function GenerationStep({ tableOfContents, bookTitle }: GenerationStepProps) {
  const generationProgress = useGenerationStore((state) => state.generationProgress);
  const viewingChapterIndex = useGenerationStore((state) => state.viewingChapterIndex);
  const currentChapterIndex = useGenerationStore((state) => state.currentChapterIndex);
  const awaitingChapterDecision = useGenerationStore((state) => state.awaitingChapterDecision);
  const { confirmChapter } = generationActions;
  const { currentSection, currentOutline } = generationProgress;

  const isViewingCurrentChapter =
    currentChapterIndex >= 0 && viewingChapterIndex === currentChapterIndex;

  const currentSectionTitle =
    currentSection && currentOutline && currentSection > 0
      ? currentOutline.sections[currentSection - 1]?.title
      : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-neutral-50 md:flex-row">
      {/* Mobile Nav - Visible only on mobile */}
      <div className="sticky top-0 z-30 flex-none border-neutral-200 border-b bg-white md:hidden">
        <ChapterTabs tableOfContents={tableOfContents} />
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden h-full flex-none md:flex">
        <GenerationSidebar tableOfContents={tableOfContents} />
      </aside>

      {/* Main Content Area */}
      <main className="h-full flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:py-12">
          <div className="mb-8">
            <h1 className="mb-2 font-bold font-serif text-2xl text-neutral-900 md:text-3xl">
              {bookTitle}
            </h1>
            <p className="font-medium text-neutral-500 text-sm uppercase tracking-wider">
              Chapter {viewingChapterIndex + 1}
            </p>
          </div>
          {/* Header Section (Status) */}
          <div className="mb-8 space-y-6">
            {isViewingCurrentChapter && currentChapterIndex >= 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 font-bold text-sm text-white">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white"></span>
                    </span>
                    WRITING
                  </span>
                </div>

                {currentSectionTitle && (
                  <div className="mb-4 rounded-lg border border-neutral-100 bg-neutral-50 p-4">
                    <h3 className="mb-1 font-bold text-neutral-900 text-sm">Current Section</h3>
                    <p className="font-medium text-neutral-600">{currentSectionTitle}</p>
                  </div>
                )}

                {awaitingChapterDecision && (
                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-4 text-green-800">
                      <Check size={20} />
                      <span className="font-bold">Chapter Completed</span>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={confirmChapter}
                        variant="primary"
                        className="flex-1 bg-black text-white hover:bg-neutral-800"
                      >
                        Proceed to Next Chapter
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="min-h-[500px] overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
            <ChapterContentDisplay />
          </div>
          <div className="h-20" /> {/* Bottom spacer */}
        </div>
      </main>
    </div>
  );
}
