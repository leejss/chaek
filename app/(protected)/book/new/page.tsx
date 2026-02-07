"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  canAccessStep,
  type TocGenerationStep,
  useBookCreationStore,
} from "@/context/bookCreationStore";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { bookNewStepPath } from "@/lib/routes";
import AILoadingStep from "./_components/AILoadingStep";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";

function CreateBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = searchParams.get("step") || "settings";

  const tocGeneration = useBookCreationStore((s) => s.tocGeneration);
  const tableOfContents = useBookCreationStore((s) => s.tableOfContents);

  const isAccessible = canAccessStep(currentStep as TocGenerationStep, tableOfContents);

  useEffect(() => {
    if (!isAccessible) {
      router.replace(bookNewStepPath("settings"));
    }
  }, [isAccessible, router]);

  const isLoading = tocGeneration.status === "loading";
  const isInitialTocGeneration =
    tocGeneration.status === "loading" && tocGeneration.variant === "initial";

  useBeforeUnload({ isEnabled: isLoading });

  if (!isAccessible) {
    return <div className="flex-1 bg-white" />;
  }

  if (isInitialTocGeneration) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <AILoadingStep
          title="Generating Book Structure"
          description="Analyzing your content and creating a table of contents..."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
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
