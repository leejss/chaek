"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { canAccessStep, type TocGenerationStep, useTocGenerationStore } from "@/context/tocStore";
import { cn } from "@/utils";

const STEPS_CONFIG: { id: TocGenerationStep; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "source_input", label: "Source" },
  { id: "toc_review", label: "Review" },
];

export default function StepNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = searchParams.get("step") || "settings";

  const tocGenerationStatus = useTocGenerationStore((state) => state.tocGeneration.status);
  const completedSteps = useTocGenerationStore((state) => state.completedSteps);

  const handleBack = () => {
    if (tocGenerationStatus === "loading") {
      if (!confirm("진행 중인 작업을 중단하고 이전 단계로 돌아가시겠습니까?")) {
        return;
      }
    }

    if (currentStep === "settings") {
      router.push("/book");
      return;
    }

    const currentIndex = STEPS_CONFIG.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      const prevConfig = STEPS_CONFIG[currentIndex - 1];
      if (!prevConfig) return;
      const prevStep = prevConfig.id;
      router.push(`/book/new?step=${prevStep}`);
    }
  };

  const handleStepClick = (step: TocGenerationStep) => {
    if (!canAccessStep(step)) return;
    router.push(`/book/new?step=${step}`);
  };

  return (
    <div className="sticky top-0 z-10 bg-white py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="group -ml-2 flex items-center rounded-lg px-2 py-1.5 font-bold text-neutral-500 text-sm transition-colors hover:bg-neutral-50 hover:text-black"
        >
          <ChevronLeft
            size={18}
            strokeWidth={3}
            className="mr-1 transition-transform group-hover:-translate-x-0.5"
          />
          {currentStep === "settings" ? "Back" : "Previous"}
        </button>

        <div className="flex items-center gap-4">
          {STEPS_CONFIG.map((step) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = currentStep === step.id;
            const isClickable = canAccessStep(step.id);

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn("group rounded-lg px-4 py-1 font-semibold", {
                    "border-black bg-black text-white shadow-sm": isCurrent,
                    "border-black bg-white text-black hover:bg-neutral-50 hover:shadow-sm":
                      isCompleted && !isCurrent,
                    "cursor-not-allowed border-neutral-200 bg-white text-neutral-400":
                      !isCurrent && !isCompleted,
                  })}
                >
                  {step.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
