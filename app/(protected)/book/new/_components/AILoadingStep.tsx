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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 mb-4">
          <Sparkles className="text-brand-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-neutral-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
