"use client";

import { Suspense } from "react";
import StepNavigation from "./_components/StepNavigation";

export default function NewBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col bg-white min-h-screen">
      <Suspense fallback={<div className="h-16" />}>
        <div className="px-8 pt-8 md:pt-12">
          <StepNavigation />
        </div>
      </Suspense>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
