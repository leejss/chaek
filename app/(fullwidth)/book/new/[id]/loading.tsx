import { Loader2 } from "lucide-react";

export default function BookGenerationLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div className="flex animate-in fade-in flex-col items-center gap-4 duration-700">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={2} />
        <p className="text-sm font-medium text-neutral-500">준비 중</p>
      </div>
    </div>
  );
}
