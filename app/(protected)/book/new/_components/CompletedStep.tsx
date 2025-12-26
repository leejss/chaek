"use client";

import Link from "next/link";
import Button from "../../_components/Button";
import { useBookStore } from "@/lib/book/bookContext";

export default function CompletedStep() {
  const savedBookId = useBookStore((state) => state.savedBookId);
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const content = useBookStore((state) => state.content);
  const actions = useBookStore((state) => state.actions);

  const handleNew = () => {
    actions.startNewBook();
  };

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <div className="border border-stone-200 bg-white rounded-sm p-8">
        <p className="uppercase text-xs tracking-[0.18em] text-stone-500 mb-4">
          Flow Status
        </p>
        <h1 className="font-serif text-3xl text-ink-900 mb-2">
          모든 챕터 생성이 완료되었습니다.
        </h1>
        <p className="text-stone-600 leading-relaxed">
          생성된 책은 자동으로 저장되었습니다. 아래에서 결과를 확인하거나 새로운
          책 만들기를 시작할 수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {savedBookId && (
            <Button asChild>
              <Link href={`/book/${savedBookId}`}>저장된 책 보기</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/book">라이브러리로 이동</Link>
          </Button>
          <Button variant="ghost" onClick={handleNew}>
            새 책 만들기
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border border-stone-200 bg-stone-50/60 rounded-sm p-6">
          <p className="uppercase text-[10px] tracking-[0.2em] text-stone-500 mb-3">
            Table of Contents
          </p>
          {tableOfContents.length > 0 ? (
            <ol className="space-y-2 text-stone-800">
              {tableOfContents.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-stone-400 font-mono text-xs w-6">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif">{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-stone-500 text-sm">차례 정보가 없습니다.</p>
          )}
        </div>

        <div className="border border-stone-200 bg-white rounded-sm p-6">
          <p className="uppercase text-[10px] tracking-[0.2em] text-stone-500 mb-3">
            본문 미리보기
          </p>
          {content ? (
            <div className="prose prose-sm max-w-none font-serif text-ink-900">
              <p className="line-clamp-12 whitespace-pre-line">{content}</p>
            </div>
          ) : (
            <p className="text-stone-500 text-sm">내용이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
