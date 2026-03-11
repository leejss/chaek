"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface CompletedViewProps {
  bookTitle: string;
  bookId: string;
}

export default function CompletedView({ bookTitle, bookId }: CompletedViewProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <h2 className="mb-4 font-serif text-3xl font-medium tracking-tight text-neutral-900 md:text-4xl">
          {bookTitle || "제목 없는 책"}
        </h2>
        <p className="mb-10 text-neutral-500">책 작성이 완료되었습니다.</p>

        <Link
          href={`/book/${bookId}`}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          <span>읽기 시작</span>
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
}
