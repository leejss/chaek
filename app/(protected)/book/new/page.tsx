"use client";

import { useBookStore } from "@/context/bookStore";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AILoadingStep from "./_components/AILoadingStep";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";

function CreateBookContent() {
  const searchParams = useSearchParams();
  const currentStep = searchParams.get("step") || "settings";

  const tocGeneration = useBookStore((state) => state.tocGeneration);

  const isLoading = tocGeneration.status === "loading";
  const isInitialTocGeneration =
    tocGeneration.status === "loading" && tocGeneration.variant === "initial";

  useBeforeUnload({ isEnabled: isLoading });

  if (isInitialTocGeneration) {
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

export default function CreateBookPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-white" />}>
      <CreateBookContent />
    </Suspense>
  );
}
