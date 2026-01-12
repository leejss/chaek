"use client";

import { Check, ArrowRight } from "lucide-react";

interface CompletedViewProps {
  bookTitle: string;
  bookId: string;
}

export default function CompletedView({
  bookTitle,
  bookId,
}: CompletedViewProps) {
  return (
    <div className="max-w-3xl mx-auto pt-20 pb-20">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 text-green-600">
          <Check size={32} strokeWidth={3} />
        </div>
        <h1 className="text-4xl font-bold text-black mb-4">Book generated</h1>
        <p className="text-neutral-500 font-medium mb-8 text-lg">
          &ldquo;
          <span className="text-black">{bookTitle || "Untitled Book"}</span>
          &rdquo; has been successfully created.
        </p>
        <a
          href={`/book/${bookId}`}
          className="inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold h-14 px-8 rounded-full text-lg transition-colors"
        >
          View book
          <ArrowRight size={20} strokeWidth={2.5} />
        </a>
      </div>
    </div>
  );
}
