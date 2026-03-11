"use client";

import { Suspense } from "react";
import StepNavigation from "./_components/StepNavigation";

export default function NewBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col px-4">
      <Suspense
        fallback={<div className="border-neutral-100 border-b px-6 py-5" />}
      >
        <StepNavigation />
      </Suspense>
      {children}
    </div>
  );
}
