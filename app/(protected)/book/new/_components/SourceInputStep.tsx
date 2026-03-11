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
    <div >
      <div className="mb-4">
        <h2 className="text-2xl font-medium tracking-tight text-foreground">아이디어</h2>
        <p className="text-sm text-neutral-500">
          아래에 책 아이디어를 넣어 주세요. AI가 이를 바탕으로 일관된 책 구조를 정리해 드립니다.
        </p>
      </div>

      <div className="relative">
        <textarea
          className="h-96 w-full resize-none rounded-md border border-neutral-200 bg-white p-6 text-base text-foreground leading-relaxed placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-0"
          placeholder="여기에 원문 텍스트를 붙여 넣어 주세요..."
          value={sourceText || ""}
          onChange={(e) => setBookField("sourceText", e.target.value)}
        />
        <div className="absolute right-4 bottom-4 rounded text-xs font-medium text-neutral-400 bg-white px-2 py-1">
          {sourceText?.length || 0}자
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-neutral-100">
        <Button
          onClick={handleGenerateTOC}
          disabled={!sourceText?.trim() || isLoading}
          isLoading={isLoading}
          className="w-full md:w-auto px-8"
        >
          목차 생성
        </Button>
      </div>
    </div>
  );
}
