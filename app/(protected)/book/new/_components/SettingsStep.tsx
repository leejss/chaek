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
    <div className="space-y-12">
      <div className="space-y-2">
        <h2 className="text-2xl font-medium tracking-tight text-foreground">설정</h2>
        <p className="text-sm text-neutral-500">책 생성에 사용할 기본 설정을 선택하세요.</p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">언어</label>
            <select
              value={language}
              onChange={(e) => setBookField("language", e.target.value as Language)}
              className="mt-1 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-foreground focus:border-neutral-400 focus:outline-none focus:ring-0"
            >
              <option value="Korean">한국어</option>
              <option value="English">영어</option>
            </select>
            <p className="text-xs text-neutral-500">책 생성에 사용할 언어를 선택하세요.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">챕터 수</label>
            <select
              value={chapterCount === "Auto" ? "Auto" : String(chapterCount)}
              onChange={handleChapterCountChange}
              className="mt-1 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-foreground focus:border-neutral-400 focus:outline-none focus:ring-0"
            >
              <option value="Auto">자동</option>
              {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              자동으로 선택하면 AI가 책의 길이에 맞게 결정합니다.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">지침</label>
          <textarea
            value={userPreference}
            onChange={(e) => setBookField("userPreference", e.target.value)}
            rows={4}
            className="mt-1 block w-full resize-none rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-0"
            placeholder="예시: 친절하고 대화체로 작성해주세요."
          />
          <p className="text-xs text-neutral-500">
            이 지침은 AI 프롬프트에 추가되어 책 생성에 반영됩니다.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-neutral-100">
        <Button onClick={handleContinue} className="w-full md:w-auto px-8">
          다음
        </Button>
      </div>
    </div>
  );
}
