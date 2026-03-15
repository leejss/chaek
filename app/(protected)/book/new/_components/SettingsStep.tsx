"use client";

import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import Button from "@/components/Button";
import { setBookField, useBookCreationStore } from "@/context/bookCreationStore";
import type { Language } from "@/lib/ai/schemas/settings";
import { bookNewStepPath } from "@/lib/routes";

export default function SettingsStep({ draftId }: { draftId: string }) {
  const router = useRouter();
  const { language, chapterCount, userPreference } = useBookCreationStore(
    useShallow((s) => ({
      language: s.language,
      chapterCount: s.chapterCount,
      userPreference: s.userPreference,
    })),
  );

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBookField("chapterCount", val === "Auto" ? "Auto" : parseInt(val, 10));
  };

  const handleContinue = () => {
    router.push(bookNewStepPath("source_input", draftId));
  };

  return (
    <div className="space-y-20">
      <div className="space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">책 설정</h2>
        <p className="text-neutral-500">
          책을 생성하기 위한 기본 환경을 설정합니다.
        </p>
      </div>

      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-3">
            <label className="block text-xs font-semibold tracking-wide text-neutral-400">생성 언어</label>
            <select
              value={language}
              onChange={(e) => setBookField("language", e.target.value as Language)}
              className="mt-2 block w-full appearance-none border-0 border-b border-neutral-200 bg-transparent px-0 py-3 text-lg text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="Korean">한국어</option>
              <option value="English">영어</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold tracking-wide text-neutral-400">챕터 개수</label>
            <select
              value={chapterCount === "Auto" ? "Auto" : String(chapterCount)}
              onChange={handleChapterCountChange}
              className="mt-2 block w-full appearance-none border-0 border-b border-neutral-200 bg-transparent px-0 py-3 text-lg text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="Auto">자동 (내용에 맞게)</option>
              {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
                <option key={n} value={String(n)}>
                  {n} 챕터
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold tracking-wide text-neutral-400">세부 지침 (선택 사항)</label>
          <textarea
            value={userPreference}
            onChange={(e) => setBookField("userPreference", e.target.value)}
            rows={3}
            className="mt-2 block w-full resize-none border-0 border-b border-neutral-200 bg-transparent px-0 py-3 text-lg text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-0"
            placeholder="예시: 친절하고 대화체로 작성해주세요."
          />
        </div>
      </div>

      <div className="flex justify-end pt-12">
        <Button 
          variant="ghost" 
          onClick={handleContinue} 
          className="px-0 py-2 h-auto text-sm tracking-wide font-medium hover:bg-transparent hover:text-neutral-500"
        >
          다음 단계로 -{">"}
        </Button>
      </div>
    </div>
  );
}
