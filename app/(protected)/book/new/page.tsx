"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useBookStore } from "@/lib/book/bookContext";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";
import GenerationStep from "./_components/GenerationStep";
import AILoadingStep from "./_components/AILoadingStep";
import StatusOverview from "./_components/StatusOverview";

export default function CreateBookPage() {
  const router = useRouter();
  const flowStatus = useBookStore((state) => state.flowStatus);
  const isProcessing = useBookStore((state) => state.isProcessing);
  const actions = useBookStore((state) => state.actions);

  const isGenerating =
    flowStatus === "generating_plan" ||
    flowStatus === "generating_outlines" ||
    flowStatus === "generating_sections" ||
    flowStatus === "generating_book" ||
    flowStatus === "chapter_review";

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing || isGenerating) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing, isGenerating]);

  const handleBack = () => {
    // 1. Settings 단계에서는 라이브러리 목록으로 돌아감
    if (flowStatus === "settings") {
      if (
        (isProcessing || isGenerating) &&
        !confirm("작업이 진행 중입니다. 정말 나가시겠습니까?")
      ) {
        return;
      }
      router.push("/book");
      return;
    }

    // 2. 진행 중인 상태(Processing/Generating)인 경우 확인 후 중단 및 이전 단계로
    if (isProcessing || isGenerating) {
      if (!confirm("진행 중인 작업을 중단하고 이전 단계로 돌아가시겠습니까?")) {
        return;
      }
      if (isGenerating) {
        actions.cancelGeneration();
      }

      // 구체적인 상태에 따른 복구 지점
      if (flowStatus === "generating_toc") {
        actions.setFlowStatus("draft");
      } else {
        // Plan 생성이나 본문 생성 중에는 TOC 리뷰 단계로 돌아감
        actions.setFlowStatus("toc_review");
      }
      return;
    }

    // 3. 고정된 각 단계에서의 이전 단계 정의
    switch (flowStatus) {
      case "draft":
        actions.setFlowStatus("settings");
        break;
      case "toc_review":
        actions.setFlowStatus("draft");
        break;
      case "completed":
        actions.setFlowStatus("toc_review");
        break;
      case "plan_review":
        actions.setFlowStatus("toc_review");
        break;
      default:
        // 정의되지 않은 상태나 예외 케이스 처리
        actions.setFlowStatus("settings");
        break;
    }
  };

  const backLabel =
    flowStatus === "settings" ? "Back to Library" : "Previous Step";

  return (
    <div className="max-w-4xl mx-auto bg-white border border-stone-200 shadow-xl rounded-sm min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
        <button
          onClick={handleBack}
          className="flex items-center text-stone-500 hover:text-brand-900 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={16} className="mr-1" />
          {backLabel}
        </button>

        <div className="px-3 py-1 bg-stone-200 text-stone-600 text-xs font-bold rounded uppercase tracking-wider">
          {flowStatus?.replace("_", " ")}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
        {flowStatus === "settings" && <SettingsStep />}
        {flowStatus === "draft" && <SourceInputStep />}
        {flowStatus === "generating_toc" && (
          <AILoadingStep
            title="Generating Book Structure"
            description="Analyzing your content and creating a table of contents..."
          />
        )}
        {flowStatus === "generating_plan" && (
          <AILoadingStep
            title="Building Writing Plan"
            description="Organizing chapters and preparing the detailed structure..."
          />
        )}
        {flowStatus === "toc_review" && <TOCReviewStep />}
        {isGenerating && flowStatus !== "generating_plan" && <GenerationStep />}
      </div>

      <StatusOverview />
    </div>
  );
}
