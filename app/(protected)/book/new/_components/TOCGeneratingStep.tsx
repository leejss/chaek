"use client";

import { Sparkles } from "lucide-react";

export default function TOCGeneratingStep() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 mb-4">
          <Sparkles className="animate-spin text-brand-900" size={32} />
        </div>
        <h3 className="text-xl font-serif text-brand-900">
          Generating Book Structure
        </h3>
        <p className="text-stone-500 text-sm">
          Analyzing your content and creating a table of contents...
        </p>
      </div>
    </div>
  );
}
