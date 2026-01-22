"use client";

import { useBookStore } from "@/context/bookStore";
import { Step } from "@/context/types/book";
import { cn } from "@/utils";
import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const STEPS_CONFIG: { id: Step; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "source_input", label: "Source" },
  { id: "toc_review", label: "Review" },
];

export default function StepNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = (searchParams.get("step") as Step) || "settings";

  const tocGeneration = useBookStore((state) => state.tocGeneration);
  const completedSteps = useBookStore((state) => state.completedSteps);
  const canAccessStep = useBookStore((state) => state.actions.canAccessStep);

  const isLoading = tocGeneration.status === "loading";

  const handleBack = () => {
    if (isLoading) {
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

  const handleStepClick = (step: Step) => {
    if (!canAccessStep(step)) return;
    router.push(`/book/new?step=${step}`);
  };

  return (
    <div className="px-6 py-5 bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="group flex items-center text-neutral-500 hover:text-black transition-colors text-sm font-bold px-2 py-1.5 -ml-2 rounded-lg hover:bg-neutral-50"
        >
          <ChevronLeft
            size={18}
            strokeWidth={3}
            className="mr-1 transition-transform group-hover:-translate-x-0.5"
          />
          {currentStep === "settings" ? "BACK" : "PREVIOUS"}
        </button>

        <div className="flex items-center">
          {STEPS_CONFIG.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = currentStep === step.id;
            const isClickable = canAccessStep(step.id);

            return (
              <div key={step.id} className="flex items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-2 rounded-full",
                      isCompleted || isCurrent ? "bg-black" : "bg-neutral-200",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "group flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-200",
                    isCurrent
                      ? "bg-black text-white border-black"
                      : isCompleted
                        ? "bg-white text-black border-black hover:bg-neutral-50"
                        : "bg-white text-neutral-400 border-neutral-200",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold tracking-wide uppercase",
                      !isCurrent && !isCompleted && "hidden sm:inline-block",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
