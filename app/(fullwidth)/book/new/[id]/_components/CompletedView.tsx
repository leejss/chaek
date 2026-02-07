"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

interface CompletedViewProps {
  bookTitle: string;
  bookId: string;
}

export default function CompletedView({ bookTitle, bookId }: CompletedViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-neutral-50/50 p-8">
      <div className="fade-in zoom-in-95 w-full max-w-2xl animate-in text-center duration-500">
        <div className="mb-12">
          <h2 className="mb-6 font-bold font-serif text-4xl text-neutral-900 leading-tight md:text-5xl">
            {bookTitle || "Untitled Book"}
          </h2>
          <p className="text-lg text-neutral-500">
            Your book has been successfully written and is ready for review.
          </p>
        </div>

        <Link
          href={`/book/${bookId}`}
          className="group inline-flex h-16 items-center justify-center gap-3 rounded-full bg-black px-10 font-bold text-lg text-white shadow-lg transition-all hover:scale-105 hover:bg-neutral-800 hover:shadow-xl"
        >
          <BookOpen
            size={20}
            className="text-neutral-300 transition-colors group-hover:text-white"
          />
          <span>Start Reading</span>
          <ArrowRight
            size={20}
            strokeWidth={2.5}
            className="-ml-5 opacity-0 transition-all duration-300 group-hover:ml-0 group-hover:opacity-100"
          />
        </Link>
      </div>
    </div>
  );
}
