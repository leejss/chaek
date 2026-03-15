import { ArrowRight, RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import { cn } from "@/utils";

type TOCReviewFooterProps = {
  saveError: string | null;
  isRegenerating: boolean;
  isSaving: boolean;
  canStartWriting: boolean;
  onRegenerate: () => Promise<void>;
  onStartWriting: () => Promise<void>;
};

export default function TOCReviewFooter({
  saveError,
  isRegenerating,
  isSaving,
  canStartWriting,
  onRegenerate,
  onStartWriting,
}: TOCReviewFooterProps) {
  return (
    <div className="pt-24">
      {saveError && (
        <div className="mb-8 text-sm font-medium text-red-500">{saveError}</div>
      )}

      <div className="flex flex-col justify-between gap-8 border-t border-neutral-100 pt-10 md:flex-row md:items-end">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center text-xs font-semibold tracking-wide text-neutral-400 transition-colors hover:text-neutral-900 disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={cn("mr-2", isRegenerating && "animate-spin")}
          />
          목차 다시 생성하기
        </button>

        <Button
          variant="ghost"
          onClick={onStartWriting}
          disabled={!canStartWriting}
          className="group h-auto px-0 py-2 text-sm font-semibold tracking-wide text-neutral-900 hover:bg-transparent hover:text-neutral-600 disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "작성 시작하기"}
          {!isSaving && (
            <ArrowRight
              size={14}
              className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
            />
          )}
        </Button>
      </div>
    </div>
  );
}
