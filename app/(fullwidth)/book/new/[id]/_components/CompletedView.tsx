"use client";

import { Check, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

interface CompletedViewProps {
  bookTitle: string;
  bookId: string;
}

export default function CompletedView({
  bookTitle,
  bookId,
}: CompletedViewProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-neutral-50/50">
      <div className="max-w-2xl w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 relative inline-flex">
          <div className="absolute inset-0 bg-green-200 rounded-full opacity-20 animate-ping" />
          <div className="relative inline-flex items-center justify-center w-24 h-24 bg-white rounded-full text-green-600 shadow-sm border border-green-100">
            <Check size={48} strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6">
          Generation Complete
        </h1>

        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-6 leading-tight">
            {bookTitle || "Untitled Book"}
          </h2>
          <p className="text-neutral-500 text-lg">
            Your book has been successfully written and is ready for review.
          </p>
        </div>

        <Link
          href={`/book/${bookId}`}
          className="group inline-flex items-center justify-center gap-3 bg-black text-white font-bold h-16 px-10 rounded-full text-lg transition-all hover:scale-105 hover:bg-neutral-800 shadow-lg hover:shadow-xl"
        >
          <BookOpen
            size={20}
            className="text-neutral-300 group-hover:text-white transition-colors"
          />
          <span>Start Reading</span>
          <ArrowRight
            size={20}
            strokeWidth={2.5}
            className="opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300"
          />
        </Link>
      </div>
    </div>
  );
}
