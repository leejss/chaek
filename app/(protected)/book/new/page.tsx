"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useBookStore } from "@/lib/book/bookContext";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";
import GenerationStep from "./_components/GenerationStep";

export default function CreateBookPage() {
  const router = useRouter();
  const currentBook = useBookStore((state) => state.currentBook);
  const flowStatus = useBookStore((state) => state.flowStatus);
  const isProcessing = useBookStore((state) => state.isProcessing);

  const isGenerating =
    flowStatus === "generating_outlines" ||
    flowStatus === "generating_sections" ||
    flowStatus === "generating_book" ||
    flowStatus === "chapter_review";

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing || isGenerating) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to show confirmation dialog
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing, isGenerating]);

  // Redirect on completion
  useEffect(() => {
    if (flowStatus === "completed" && currentBook.id) {
      router.push(`/book/${currentBook.id}`);
    }
  }, [flowStatus, currentBook.id, router]);

  const handleReturnToList = () => {
    if (
      (isProcessing || isGenerating) &&
      !confirm("작업이 진행 중입니다. 정말 나가시겠습니까?")
    ) {
      return;
    }
    router.push("/book");
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-stone-200 shadow-xl rounded-sm min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
        <button
          onClick={handleReturnToList}
          className="flex items-center text-stone-500 hover:text-brand-900 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Library
        </button>

        <div className="px-3 py-1 bg-stone-200 text-stone-600 text-xs font-bold rounded uppercase tracking-wider">
          {flowStatus?.replace("_", " ")}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
        {/* STEP 0: SETTINGS */}
        {flowStatus === "settings" && <SettingsStep />}

        {/* STEP 1: SOURCE INPUT */}
        {flowStatus === "draft" && <SourceInputStep />}

        {/* STEP 2: TOC REVIEW */}
        {flowStatus === "toc_review" && <TOCReviewStep />}

        {/* STEP 3: GENERATION STREAMING */}
        {isGenerating && <GenerationStep />}
      </div>
    </div>
  );
}
