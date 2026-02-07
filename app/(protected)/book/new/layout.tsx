"use client";

import { Suspense } from "react";
import { useBookCreationStore } from "@/context/bookCreationStore";
import StepNavigation from "./_components/StepNavigation";

export default function NewBookLayout({ children }: { children: React.ReactNode }) {
  const handleDebugStore = () => {
    const snapshot = useBookCreationStore.getState();
    console.log("[bookCreationStore] snapshot", snapshot);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col bg-white px-4">
      <Suspense fallback={<div className="border-neutral-100 border-b px-6 py-5" />}>
        <StepNavigation />
      </Suspense>
      {children}
      <button
        type="button"
        onClick={handleDebugStore}
        className="fixed right-6 bottom-6 z-50 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-sm text-white shadow-lg transition hover:bg-neutral-700"
      >
        Debug Store
      </button>
    </div>
  );
}
