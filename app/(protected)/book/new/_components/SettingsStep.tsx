"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { updateSettingsStore, useSettingsStore } from "@/context/settingsStore";
import { completeStep } from "@/context/tocStore";
import type { Language } from "@/lib/ai/schemas/settings";

export default function SettingsStep() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);
  const { language, chapterCount, userPreference } = settings;

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSettingsStore("settings", {
      ...settings,
      chapterCount: val === "Auto" ? "Auto" : parseInt(val, 10),
    });
  };

  const handleContinue = () => {
    completeStep("settings");
    router.push("/book/new?step=source_input");
  };

  return (
    <div className="mx-auto space-y-10">
      <div className="mb-12 text-center">
        <h2 className="mb-4 font-extrabold text-4xl text-black tracking-tight">Settings</h2>
        <p className="font-medium text-neutral-500">
          Configure your book preferences before we begin.
        </p>
      </div>
      <div className="space-y-10 rounded-md border border-neutral-200 bg-white p-6">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block font-bold text-black">Language</label>
              <select
                value={language}
                onChange={(e) =>
                  updateSettingsStore("settings", {
                    ...settings,
                    language: e.target.value as Language,
                  })
                }
                className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white p-2 font-medium text-black focus:border-black focus:ring-black sm:text-sm"
              >
                <option value="Korean">Korean (한국어)</option>
                <option value="English">English</option>
              </select>
              <p className="font-medium text-neutral-500 text-xs">
                The language used for generating content.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block font-bold text-black">Chapter Count</label>
              <select
                value={chapterCount === "Auto" ? "Auto" : String(chapterCount)}
                onChange={handleChapterCountChange}
                className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white p-2 font-medium text-black focus:border-black focus:ring-black sm:text-sm"
              >
                <option value="Auto">Auto</option>
                {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
              <p className="font-medium text-neutral-500 text-xs">
                Number of chapters (3–10) or Auto.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block font-bold text-black">Custom Instructions</label>
            <textarea
              value={userPreference}
              onChange={(e) =>
                updateSettingsStore("settings", {
                  ...settings,
                  userPreference: e.target.value,
                })
              }
              rows={4}
              className="mt-1 block w-full resize-none rounded-md border border-neutral-200 bg-white p-4 font-medium text-black shadow-none placeholder:text-neutral-400 focus:border-black focus:ring-black sm:text-sm"
              placeholder="E.g., Maintain a humorous tone, use simple analogies, focus on technical depth..."
            />
            <p className="font-medium text-neutral-500 text-xs">
              These instructions will be appended to the AI prompt for every generation.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleContinue}
          className="h-14 w-full rounded-full px-12 font-bold text-lg md:w-auto"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
