"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Button from "@/components/Button";

interface CompletedViewProps {
  bookTitle: string;
  bookId: string;
}

export default function CompletedView({ bookTitle, bookId }: CompletedViewProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 py-32 text-center bg-white">
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out max-w-2xl mx-auto">
        <div className="mb-6 text-xs font-semibold tracking-wide text-neutral-400">
          작성 완료됨
        </div>
        <h2 className="mb-8 text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl md:leading-tight">
          {bookTitle || "제목 없는 책"}
        </h2>
        
        <div className="mt-16">
          <Link href={`/book/${bookId}`}>
            <Button variant="ghost" className="group h-12 px-6 text-sm tracking-wide text-neutral-600 hover:text-neutral-900">
              <span>책 읽으러 가기</span>
              <ArrowRight
                size={16}
                className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
