"use client";

import { useBookStore } from "@/context/bookStore";
import { Step } from "@/context/types/book";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { useSearchParams } from "next/navigation";
import AILoadingStep from "./_components/AILoadingStep";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";

export default function CreateBookPage() {
  const searchParams = useSearchParams();
  const currentStep = (searchParams.get("step") as Step) || "settings";

  const bookStore = useBookStore();
  const loadingState = bookStore.loadingState;

  const isLoading =
    loadingState === "generating_toc" || loadingState === "generating";

  useBeforeUnload({ isEnabled: isLoading });

  if (loadingState === "generating_toc") {
    return (
      <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white">
        <AILoadingStep
          title="Generating Book Structure"
          description="Analyzing your content and creating a table of contents..."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white">
      {currentStep === "settings" && <SettingsStep />}
      {currentStep === "source_input" && <SourceInputStep />}
      {currentStep === "toc_review" && <TOCReviewStep />}
    </div>
  );
}
