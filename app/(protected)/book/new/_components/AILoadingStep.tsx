"use client";

import { Sparkles } from "lucide-react";

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
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-900/20 mb-4">
          <Sparkles className="animate-spin text-brand-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-neutral-500 text-sm">{description}</p>
      </div>
    </div>
  );
}
