"use client";

import { Suspense } from "react";
import StepNavigation from "./_components/StepNavigation";

export default function NewBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-4xl mx-auto bg-white min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      <Suspense
        fallback={<div className="px-6 py-5 border-b border-neutral-100" />}
      >
        <StepNavigation />
      </Suspense>
      {children}
    </div>
  );
}
