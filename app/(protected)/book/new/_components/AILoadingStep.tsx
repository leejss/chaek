"use client";

import { Loader2 } from "lucide-react";

interface AILoadingStepProps {
  title: string;
  description: string;
}

export default function AILoadingStep({ title, description }: AILoadingStepProps) {
  return (
    <div className="flex flex-col pt-32 h-full bg-white">
      <div className="space-y-6">
        <div className="mb-12">
          <Loader2 className="size-6 animate-spin text-neutral-300" />
        </div>
        <div className="space-y-4">
          <h3 className="text-3xl font-semibold tracking-tight text-neutral-900">{title}</h3>
          <p className="text-xl text-neutral-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
