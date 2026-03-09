import { Loader2 } from "lucide-react";

export default function BookGenerationLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="fade-in flex animate-in flex-col items-center gap-6 duration-700">
        <Loader2 className="h-12 w-12 animate-spin text-black" strokeWidth={3} />
        <p className="font-black text-black text-lg">준비 중</p>
      </div>
    </div>
  );
}
