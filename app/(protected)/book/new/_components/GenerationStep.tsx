"use client";

import Button from "@/components/Button";
import {
  generationActions,
  useGenerationStore,
} from "@/context/generationContext";
import { Check } from "lucide-react";
import ChapterContentDisplay from "./ChapterContentDisplay";
import ChapterTabs from "./ChapterTabs";
import GenerationSidebar from "./GenerationSidebar";
import { BookGenerationSettings } from "@/lib/ai/schemas/settings";

export interface GenerationStepProps {
  tableOfContents: string[];
  bookTitle?: string;
  sourceText?: string;
  generationSettings?: BookGenerationSettings;
}

export default function GenerationStep({
  tableOfContents,
  bookTitle,
}: GenerationStepProps) {
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  );
  const viewingChapterIndex = useGenerationStore(
    (state) => state.viewingChapterIndex,
  );
  const currentChapterIndex = useGenerationStore(
    (state) => state.currentChapterIndex,
  );
  const awaitingChapterDecision = useGenerationStore(
    (state) => state.awaitingChapterDecision,
  );
  const { confirmChapter } = generationActions;
  const { currentSection, currentOutline } = generationProgress;

  const isViewingCurrentChapter =
    currentChapterIndex >= 0 && viewingChapterIndex === currentChapterIndex;

  const currentSectionTitle =
    currentSection && currentOutline && currentSection > 0
      ? currentOutline.sections[currentSection - 1]?.title
      : undefined;

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-neutral-50">
      {/* Mobile Nav - Visible only on mobile */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-neutral-200 flex-none">
        <ChapterTabs tableOfContents={tableOfContents} />
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex h-full flex-none">
        <GenerationSidebar tableOfContents={tableOfContents} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 min-h-screen">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 mb-2">
              {bookTitle}
            </h1>
            <p className="text-neutral-500 font-medium text-sm uppercase tracking-wider">
              Chapter {viewingChapterIndex + 1}
            </p>
          </div>
          {/* Header Section (Status) */}
          <div className="mb-8 space-y-6">
            {isViewingCurrentChapter && currentChapterIndex >= 0 && (
              <div className="bg-white p-6 border border-neutral-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-2 text-sm font-bold px-3 py-1 bg-black text-white rounded-full">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    WRITING
                  </span>
                </div>

                {currentSectionTitle && (
                  <div className="mb-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-1">
                      Current Section
                    </h3>
                    <p className="text-neutral-600 font-medium">
                      {currentSectionTitle}
                    </p>
                  </div>
                )}

                {awaitingChapterDecision && (
                  <div className="mt-6 flex flex-col gap-3">
                    <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3 border border-green-100">
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
          <div className="bg-white shadow-sm border border-neutral-100 min-h-[500px] rounded-xl overflow-hidden">
            <ChapterContentDisplay />
          </div>
          <div className="h-20" /> {/* Bottom spacer */}
        </div>
      </main>
    </div>
  );
}
