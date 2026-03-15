"use client";

import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import Button from "@/components/Button";
import { setBookField, useBookCreationStore } from "@/context/bookCreationStore";
import { useTocGeneration } from "@/lib/hooks/useTocGeneration";
import { bookNewStepPath } from "@/lib/routes";

export default function SourceInputStep({ draftId }: { draftId: string }) {
  const router = useRouter();

  const { sourceText, tocGeneration } = useBookCreationStore(
    useShallow((s) => ({ sourceText: s.sourceText, tocGeneration: s.tocGeneration })),
  );
  const { generate } = useTocGeneration();

  const isLoading = tocGeneration.status === "loading";
  const error = tocGeneration.status === "error" ? tocGeneration.message : null;

  const handleGenerateTOC = async () => {
    const success = await generate("initial");
    if (success) router.push(bookNewStepPath("toc_review", draftId));
  };

  return (
    <div className="space-y-20">
      <div className="space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">아이디어 입력</h2>
        <p className="text-neutral-500">
          책으로 만들고 싶은 생각이나 원문 텍스트를 자유롭게 붙여 넣어 주세요.
        </p>
      </div>

      <div className="relative pt-4">
        <textarea
          className="h-96 w-full resize-none border-0 border-b border-neutral-200 bg-transparent py-4 text-xl text-neutral-900 leading-relaxed placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-0"
          placeholder="여기에 텍스트를 입력해 주세요..."
          value={sourceText || ""}
          onChange={(e) => setBookField("sourceText", e.target.value)}
        />
        <div className="absolute right-0 bottom-4 text-xs font-semibold tracking-wide text-neutral-300 pointer-events-none bg-white py-1">
          {sourceText?.length || 0}자
        </div>
      </div>

      {error && (
        <div className="text-sm font-medium text-red-500">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-12">
        <Button
          variant="ghost" 
          onClick={handleGenerateTOC}
          disabled={!sourceText?.trim() || isLoading}
          isLoading={isLoading}
          className="px-0 py-2 h-auto text-sm tracking-wide font-medium hover:bg-transparent hover:text-neutral-500"
        >
          {isLoading ? "목차 생성 중..." : "목차 생성하기 ->"}
        </Button>
      </div>
    </div>
  );
}
