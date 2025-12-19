"use client";

import React, { useEffect, useRef } from "react";
import MarkdownRenderer from "../../_components/MarkdownRenderer";

interface GenerationStepProps {
  streamingContent: string;
}

export default function GenerationStep({
  streamingContent,
}: GenerationStepProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-0 bg-white/95 backdrop-blur py-2 border-b border-brand-100 mb-8 z-10 flex items-center justify-center gap-2 text-brand-700">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-700 border-t-transparent"></div>
        <span className="text-sm font-medium uppercase tracking-widest">
          Writing in progress...
        </span>
      </div>

      <div className="bg-white min-h-[500px]">
        <MarkdownRenderer content={streamingContent} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

