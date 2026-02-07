"use client";

import { Loader2 } from "lucide-react";

interface AILoadingStepProps {
  title: string;
  description: string;
}

export default function AILoadingStep({ title, description }: AILoadingStepProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-8 text-center">
        <div className="inline-flex items-center justify-center">
          <Loader2 className="size-10 animate-spin text-black" strokeWidth={1.5} />
        </div>
        <div className="space-y-3">
          <h3 className="font-extrabold text-3xl text-black">{title}</h3>
          <p className="mx-auto max-w-sm font-bold text-neutral-500 text-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}
