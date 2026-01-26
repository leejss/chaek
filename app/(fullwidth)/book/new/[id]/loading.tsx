import { Loader2 } from "lucide-react";

export default function BookGenerationLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        <Loader2
          className="h-12 w-12 animate-spin text-black"
          strokeWidth={3}
        />
        <p className="text-lg font-black text-black">Preparing</p>
      </div>
    </div>
  );
}
