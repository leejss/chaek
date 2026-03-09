"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { setBookField, useBookCreationStore } from "@/context/bookCreationStore";
import { useTocGeneration } from "@/lib/hooks/useTocGeneration";
import { bookNewStepPath } from "@/lib/routes";

export default function SourceInputStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId") || undefined;

  const sourceText = useBookCreationStore((s) => s.sourceText);
  const tocGeneration = useBookCreationStore((s) => s.tocGeneration);
  const { generate } = useTocGeneration();

  const isLoading = tocGeneration.status === "loading";
  const error = tocGeneration.status === "error" ? tocGeneration.message : null;

  const handleGenerateTOC = async () => {
    const success = await generate("initial");
    if (success) router.push(bookNewStepPath("toc_review", draftId));
  };

  return (
    <div className="space-y-10">
      <div className="mb-12 text-center">
        <h2 className="mb-4 font-bold text-4xl text-black">아이디어</h2>
        <p className="font-medium text-neutral-500">
          아래에 책 아이디어를 넣어 주세요. AI가 이를 바탕으로 일관된 책 구조를 정리해 드립니다.
        </p>
      </div>

      <div className="relative">
        <textarea
          className="h-96 w-full resize-none rounded-md border border-neutral-200 bg-white p-6 font-medium text-black text-lg leading-relaxed placeholder:text-neutral-400 focus:border-black focus:ring-0"
          placeholder="여기에 원문 텍스트를 붙여 넣어 주세요..."
          value={sourceText || ""}
          onChange={(e) => setBookField("sourceText", e.target.value)}
        />
        <div className="absolute right-4 bottom-4 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 font-bold text-black text-xs uppercase tracking-wide">
          {sourceText?.length || 0}자
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleGenerateTOC}
          disabled={!sourceText?.trim() || isLoading}
          isLoading={isLoading}
          className="h-14 w-full rounded-full px-12 font-bold text-lg md:w-auto"
        >
          목차 생성
        </Button>
      </div>
    </div>
  );
}
