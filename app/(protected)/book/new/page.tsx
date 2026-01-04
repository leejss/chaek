"use client";

import { useBookStore } from "@/lib/book/bookContext";
import { useCreditBalance } from "@/lib/hooks/useCreditBalance";
import {
  Check,
  ChevronLeft,
  FileText,
  ListTree,
  Settings2,
} from "lucide-react";
import { cn } from "@/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AILoadingStep from "./_components/AILoadingStep";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";

const FLOW_STEPS = ["settings", "source_input", "toc_review"] as const;

const STEPS_CONFIG = [
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "source_input", label: "Source", icon: FileText },
  { id: "toc_review", label: "Review", icon: ListTree },
] as const;

const BOOK_CREATION_COST = 10;

export default function CreateBookPage() {
  const router = useRouter();
  const bookStore = useBookStore();

  const flowStatus = bookStore.flowStatus;
  const isProcessing = bookStore.isProcessing;
  const actions = bookStore.actions;
  const completedSteps = bookStore.completedSteps;
  const { balance, isLoading: isLoadingBalance } = useCreditBalance();
  const isGenerating = flowStatus === "generating";

  const currentStepIndex = FLOW_STEPS.indexOf(
    flowStatus as (typeof FLOW_STEPS)[number],
  );

  const hasInsufficientCredits =
    balance !== null && balance < BOOK_CREATION_COST;

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
    if (flowStatus === "settings") {
      if (
        (isProcessing || isGenerating) &&
        !confirm("작업이 진행 중입니다. 정말 나가시겠습니까?")
      ) {
        router.push("/book");
        return;
      }
    }

    if (isProcessing || isGenerating) {
      if (!confirm("진행 중인 작업을 중단하고 이전 단계로 돌아가시겠습니까?")) {
        return;
      }

      if (flowStatus === "generating_toc") {
        actions.setFlowStatus("source_input");
      } else {
        actions.setFlowStatus("toc_review");
      }
      return;
    }

    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      actions.setFlowStatus(FLOW_STEPS[prevIndex]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Credit Balance Warning */}
      {!isLoadingBalance && hasInsufficientCredits && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span className="text-sm font-bold text-red-900">
                INSUFFICIENT CREDITS: {BOOK_CREATION_COST} CREDITS REQUIRED
                (BALANCE: {balance})
              </span>
            </div>
            <Link
              href="/credits"
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors uppercase tracking-wide"
            >
              Get Credits
            </Link>
          </div>
        </div>
      )}

      {/* Step Navigation */}
      <div className="px-6 py-5 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="group flex items-center text-neutral-500 hover:text-black transition-colors text-sm font-bold px-2 py-1.5 -ml-2 rounded-lg hover:bg-neutral-50"
          >
            <ChevronLeft
              size={18}
              strokeWidth={3}
              className="mr-1 transition-transform group-hover:-translate-x-0.5"
            />
            {flowStatus === "settings" ? "BACK" : "PREVIOUS"}
          </button>

          <div className="flex items-center">
            {STEPS_CONFIG.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(
                step.id as (typeof FLOW_STEPS)[number],
              );
              const isCurrent = flowStatus === step.id;
              const isClickable = isCompleted;

              return (
                <div key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        "w-8 h-[2px] mx-2 rounded-full",
                        isCompleted || isCurrent
                          ? "bg-black"
                          : "bg-neutral-200",
                      )}
                    />
                  )}
                  <button
                    onClick={() =>
                      isClickable &&
                      actions.goToStep(step.id as (typeof FLOW_STEPS)[number])
                    }
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
                    <div
                      className={cn(
                        "rounded-full p-0.5",
                        isCurrent
                          ? "bg-white/20"
                          : isCompleted
                          ? "bg-transparent"
                          : "bg-transparent",
                      )}
                    >
                      {isCompleted ? (
                        <Check size={14} strokeWidth={4} />
                      ) : (
                        <StepIcon size={14} strokeWidth={3} />
                      )}
                    </div>
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

      {/* Content Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white">
        {flowStatus === "settings" && <SettingsStep />}
        {flowStatus === "source_input" && <SourceInputStep />}
        {flowStatus === "generating_toc" && (
          <AILoadingStep
            title="Generating Book Structure"
            description="Analyzing your content and creating a table of contents..."
          />
        )}
        {flowStatus === "toc_review" && <TOCReviewStep />}
      </div>
    </div>
  );
}
