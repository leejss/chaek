"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { setBookField, useBookCreationStore } from "@/context/bookCreationStore";
import type { Language } from "@/lib/ai/schemas/settings";
import { bookNewStepPath } from "@/lib/routes";

export default function SettingsStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId") || undefined;
  const language = useBookCreationStore((s) => s.language);
  const chapterCount = useBookCreationStore((s) => s.chapterCount);
  const userPreference = useBookCreationStore((s) => s.userPreference);

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBookField("chapterCount", val === "Auto" ? "Auto" : parseInt(val, 10));
  };

  const handleContinue = () => {
    router.push(bookNewStepPath("source_input", draftId));
  };

  return (
    <div className="mx-auto space-y-10">
      <div className="mb-12 text-center">
        <h2 className="mb-4 font-extrabold text-4xl text-black tracking-tight">설정</h2>
        <p className="font-medium text-neutral-500">책 생성에 사용할 기본 설정을 선택하세요.</p>
      </div>
      <div className="space-y-10 rounded-md border border-neutral-200 bg-white p-6">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block font-bold text-black">언어</label>
              <select
                value={language}
                onChange={(e) => setBookField("language", e.target.value as Language)}
                className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white p-2 font-medium text-black focus:border-black focus:ring-black sm:text-sm"
              >
                <option value="Korean">한국어</option>
                <option value="English">영어</option>
              </select>
              <p className="font-medium text-neutral-500 text-xs">
                책 생성에 사용할 언어를 선택하세요.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block font-bold text-black">챕터 수</label>
              <select
                value={chapterCount === "Auto" ? "Auto" : String(chapterCount)}
                onChange={handleChapterCountChange}
                className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white p-2 font-medium text-black focus:border-black focus:ring-black sm:text-sm"
              >
                <option value="Auto">자동</option>
                {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
              <p className="font-medium text-neutral-500 text-xs">
                챕터 수를 선택하세요. 자동으로 선택하면 AI가 책의 길이에 맞게 챕터 수를 결정합니다.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block font-bold text-black">지침</label>
            <textarea
              value={userPreference}
              onChange={(e) => setBookField("userPreference", e.target.value)}
              rows={4}
              className="mt-1 block w-full resize-none rounded-md border border-neutral-200 bg-white p-4 font-medium text-black shadow-none placeholder:text-neutral-400 focus:border-black focus:ring-black sm:text-sm"
              placeholder="예시: 책의 톤은 친절하고 대화체로 해주세요."
            />
            <p className="font-medium text-neutral-500 text-xs">
              이 지침은 AI 프롬프트에 추가되어 책 생성에 반영됩니다.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleContinue}
          className="h-14 w-full rounded-full px-12 font-bold text-lg md:w-auto"
        >
          다음
        </Button>
      </div>
    </div>
  );
}
