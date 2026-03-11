"use client";

import { Loader2 } from "lucide-react";

interface AILoadingStepProps {
  title: string;
  description: string;
}

export default function AILoadingStep({ title, description }: AILoadingStepProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-foreground">{title}</h3>
          <p className="mx-auto max-w-sm text-sm text-neutral-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
