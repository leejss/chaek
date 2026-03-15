"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import {
  canAccessStep,
  isStepCompleted,
  type TocGenerationStep,
  useBookCreationStore,
} from "@/context/bookCreationStore";
import { bookNewStepPath, ROUTES } from "@/lib/routes";
import { cn } from "@/utils";

const STEPS_CONFIG: { id: TocGenerationStep; label: string }[] = [
  { id: "settings", label: "01. 설정" },
  { id: "source_input", label: "02. 아이디어" },
  { id: "toc_review", label: "03. 검토" },
];

export default function StepNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId") || undefined;
  const currentStep = searchParams.get("step") || "settings";

  const { isGenerating, tableOfContents } = useBookCreationStore(
    useShallow((s) => ({
      isGenerating: s.tocGeneration.status === "loading",
      tableOfContents: s.tableOfContents,
    })),
  );

  const handleBack = () => {
    if (isGenerating) {
      if (!confirm("진행 중인 작업을 중단하고 이전 단계로 돌아가시겠습니까?")) {
        return;
      }
    }

    if (currentStep === "settings") {
      router.push(ROUTES.BOOK_LIST);
      return;
    }

    const currentIndex = STEPS_CONFIG.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      const prevConfig = STEPS_CONFIG[currentIndex - 1];
      if (!prevConfig) return;
      router.push(bookNewStepPath(prevConfig.id, draftId));
    }
  };

  const handleStepClick = (step: TocGenerationStep) => {
    if (!canAccessStep(step, tableOfContents)) return;
    router.push(bookNewStepPath(step, draftId));
  };

  return (
    <div className="flex items-center justify-between pb-8">
      <button
        type="button"
        onClick={handleBack}
        className="group flex items-center font-medium text-neutral-400 text-xs tracking-wide transition-colors hover:text-neutral-900"
      >
        <ChevronLeft
          size={14}
          strokeWidth={2}
          className="mr-1 transition-transform group-hover:-translate-x-0.5"
        />
        뒤로가기
      </button>

      <div className="flex items-center gap-6">
        {STEPS_CONFIG.map((step) => {
          const isCompleted = isStepCompleted(step.id, tableOfContents);
          const isCurrent = currentStep === step.id;
          const isClickable = canAccessStep(step.id, tableOfContents);

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={!isClickable}
                className={cn("text-xs tracking-wide transition-colors", {
                  "font-semibold text-neutral-900": isCurrent,
                  "font-medium text-neutral-400 hover:text-neutral-900":
                    isCompleted && !isCurrent,
                  "cursor-not-allowed font-medium text-neutral-200": !isCurrent && !isCompleted,
                })}
              >
                {step.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
