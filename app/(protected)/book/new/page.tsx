"use client";

import { useBookStore } from "@/lib/book/bookContext";
import { useGenerationStore, generationStoreActions } from "@/lib/book/generationContext";
import { FlowStatus } from "@/lib/book/types";
import { useCreditBalance } from "@/lib/hooks/useCreditBalance";
import { Check, ChevronLeft, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AILoadingStep from "./_components/AILoadingStep";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import StatusOverview from "./_components/StatusOverview";
import TOCReviewStep from "./_components/TOCReviewStep";

const FLOW_STEPS = ["settings", "source_input", "toc_review"] as const;

const STEP_LABELS: Record<(typeof FLOW_STEPS)[number], string> = {
  settings: "Settings",
  source_input: "Source Input",
  toc_review: "Review Table of Contents",
};

function getStepStatus(
  step: FlowStatus,
  currentStatus: FlowStatus,
  completedSteps: Set<FlowStatus>,
): "completed" | "current" | "disabled" | "available" {
  if (completedSteps.has(step)) return "completed";
  if (step === currentStatus) return "current";
  return "disabled";
}

const BOOK_CREATION_COST = 10;

export default function CreateBookPage() {
  const router = useRouter();
  const bookStore = useBookStore();
  const genStore = useGenerationStore();

  const flowStatus = bookStore.flowStatus;
  const isProcessing = bookStore.isProcessing;
  const actions = bookStore.actions;
  const completedSteps = bookStore.completedSteps;
  const bookGenerationStarted = genStore.bookGenerationStarted;
  const savedBookId = genStore.savedBookId;
  const { balance, isLoading: isLoadingBalance } = useCreditBalance();
  const isGenerating = flowStatus === "generating";

  const currentStepIndex = FLOW_STEPS.indexOf(
    flowStatus as (typeof FLOW_STEPS)[number],
  );

  const hasInsufficientCredits =
    balance !== null && balance < BOOK_CREATION_COST;

  useEffect(() => {
    if (flowStatus === "generating" && savedBookId) {
      router.replace(`/new/${savedBookId}`);
    }
  }, [flowStatus, savedBookId, router]);

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
      if (isGenerating) {
        generationStoreActions.cancelGeneration();
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
    <div className="max-w-4xl mx-auto bg-background border border-neutral-200 rounded-2xl min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Credit Balance Warning */}
      {!isLoadingBalance && hasInsufficientCredits && (
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-yellow-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span className="text-sm font-medium text-yellow-800">
                Insufficient credits: You need {BOOK_CREATION_COST} credits to
                create a book, but you have {balance}.
              </span>
            </div>
            <Link
              href="/credits"
              className="rounded bg-yellow-600 px-3 py-1 text-sm font-semibold text-white hover:bg-yellow-700"
            >
              Purchase Credits
            </Link>
          </div>
        </div>
      )}

      {!isLoadingBalance && balance !== null && !hasInsufficientCredits && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800">
              Available credits:{" "}
              <span className="font-semibold">{balance}</span> (This book will
              cost {BOOK_CREATION_COST} credits)
            </span>
          </div>
        </div>
      )}

      {/* Step Navigation */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="flex items-center text-neutral-600 hover:text-foreground transition-colors text-sm font-medium px-2 py-1"
            >
              <ChevronLeft size={16} className="mr-1" />
              {flowStatus === "settings" ? "Back" : "Previous"}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {FLOW_STEPS.map((step) => {
              const stepStatus = getStepStatus(
                step,
                flowStatus,
                completedSteps,
              );
              const isClickable =
                stepStatus === "completed" || stepStatus === "available";
              const isCurrent = stepStatus === "current";

              return (
                <button
                  key={step}
                  onClick={() => isClickable && actions.goToStep(step)}
                  disabled={
                    !isClickable ||
                    (bookGenerationStarted &&
                      step !== "settings" &&
                      step !== "toc_review")
                  }
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${
                      isCurrent
                        ? "bg-brand-600 text-white"
                        : stepStatus === "completed"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-neutral-100 text-neutral-500"
                    }
                    ${
                      isClickable && !isCurrent
                        ? "hover:bg-neutral-200 hover:text-neutral-700"
                        : ""
                    }
                    ${!isClickable ? "cursor-not-allowed opacity-60" : ""}
                  `}
                >
                  {stepStatus === "completed" ? (
                    <Check size={12} className="shrink-0" />
                  ) : isCurrent ? (
                    <Circle size={8} className="shrink-0" />
                  ) : (
                    <Circle size={8} className="shrink-0" />
                  )}
                  <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
                </button>
              );
            })}
          </div>

          <div className="w-16" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
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

      <StatusOverview />
    </div>
  );
}
