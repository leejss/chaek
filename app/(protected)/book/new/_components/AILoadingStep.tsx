"use client";

import { Loader2 } from "lucide-react";

interface AILoadingStepProps {
  title: string;
  description: string;
}

export default function AILoadingStep({
  title,
  description,
}: AILoadingStepProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-8">
        <div className="inline-flex items-center justify-center">
          <Loader2
            className="w-16 h-16 animate-spin text-black"
            strokeWidth={1.5}
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-3xl font-extrabold text-black uppercase tracking-tight">
            {title}
          </h3>
          <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest max-w-sm mx-auto">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
