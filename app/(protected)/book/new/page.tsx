"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  canAccessStep,
  resetBookDraft,
  setBookStateFromDraft,
  type TocGenerationStep,
  useBookCreationStore,
} from "@/context/bookCreationStore";
import { selectBookCreationDraftSnapshot } from "@/context/types/bookCreation";
import {
  createDraftId,
  readBookCreationDraft,
  writeBookCreationDraft,
} from "@/lib/bookCreationDraft";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { bookNewStepPath } from "@/lib/routes";
import AILoadingStep from "./_components/AILoadingStep";
import SettingsStep from "./_components/SettingsStep";
import SourceInputStep from "./_components/SourceInputStep";
import TOCReviewStep from "./_components/TOCReviewStep";

const DEFAULT_STEP: TocGenerationStep = "settings";

function normalizeStep(step: string | null): TocGenerationStep {
  if (step === "source_input" || step === "toc_review") return step;
  return DEFAULT_STEP;
}

function CreateBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDraftReady, setIsDraftReady] = useState(false);

  const draftId = searchParams.get("draftId");
  const currentStep = normalizeStep(searchParams.get("step"));

  const tocGeneration = useBookCreationStore((s) => s.tocGeneration);
  const tableOfContents = useBookCreationStore((s) => s.tableOfContents);

  const isAccessible = canAccessStep(currentStep as TocGenerationStep, tableOfContents);

  useEffect(() => {
    if (draftId) return;
    const nextDraftId = createDraftId();
    router.replace(bookNewStepPath(currentStep, nextDraftId));
  }, [currentStep, draftId, router]);

  useEffect(() => {
    if (!draftId) return;
    resetBookDraft();
    const snapshot = readBookCreationDraft(draftId);
    if (snapshot) {
      setBookStateFromDraft(snapshot);
    }
    setIsDraftReady(true);
  }, [draftId]);

  useEffect(() => {
    if (!draftId || !isDraftReady) return;
    const saveSnapshot = () => {
      const state = useBookCreationStore.getState();
      writeBookCreationDraft(draftId, selectBookCreationDraftSnapshot(state));
    };
    saveSnapshot();
    const unsubscribe = useBookCreationStore.subscribe(saveSnapshot);
    return unsubscribe;
  }, [draftId, isDraftReady]);

  useEffect(() => {
    if (!draftId || !isDraftReady) return;
    if (!isAccessible) {
      router.replace(bookNewStepPath("settings", draftId));
    }
  }, [draftId, isAccessible, isDraftReady, router]);

  const isLoading = tocGeneration.status === "loading";
  const isInitialTocGeneration =
    tocGeneration.status === "loading" && tocGeneration.variant === "initial";

  useBeforeUnload({ isEnabled: isLoading });

  if (!draftId || !isDraftReady || !isAccessible) {
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
