"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { updateSettingsStore, useSettingsStore } from "@/context/settingsStore";
import { completeStep } from "@/context/tocStore";
import type { Language } from "@/lib/ai/schemas/settings";
import { cn } from "@/utils";

export default function SettingsStep() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);
  const { language, chapterCount, userPreference } = settings;

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    updateSettingsStore("settings", {
      ...settings,
      chapterCount: val as number,
    });
  };

  const toggleAutoChapters = (checked: boolean) => {
    if (checked) {
      updateSettingsStore("settings", { ...settings, chapterCount: "Auto" });
    } else {
      updateSettingsStore("settings", { ...settings, chapterCount: 5 });
    }
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

      <div className="space-y-10 rounded-xl border border-neutral-200 bg-white p-8">
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="block font-bold text-black">Output Language</label>
            <select
              value={language}
              onChange={(e) =>
                updateSettingsStore("settings", {
                  ...settings,
                  language: e.target.value as Language,
                })
              }
              className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white p-3 font-medium text-black focus:border-black focus:ring-black sm:text-sm"
            >
              <option value="Korean">Korean (한국어)</option>
              <option value="English">English</option>
            </select>
            <p className="font-medium text-neutral-500 text-xs">
              The language used for generating content.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-black">Chapter Count</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-chapters"
                  checked={chapterCount === "Auto"}
                  onChange={(e) => toggleAutoChapters(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                />
                <label htmlFor="auto-chapters" className="font-bold text-black text-sm">
                  AUTO
                </label>
              </div>
            </div>

            <div
              className={cn(
                "transition-opacity",
                chapterCount === "Auto" ? "pointer-events-none opacity-40" : "opacity-100",
              )}
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={chapterCount === "Auto" ? 5 : chapterCount}
                  onChange={handleChapterCountChange}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-black"
                />
                <span className="w-10 rounded bg-black py-1 text-center font-bold text-sm text-white">
                  {chapterCount === "Auto" ? "Auto" : chapterCount}
                </span>
              </div>
              <p className="mt-2 font-medium text-neutral-500 text-xs">Range: 3 to 10 chapters</p>
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
              className="mt-1 block w-full resize-none rounded-xl border border-neutral-200 bg-white p-4 font-medium text-black shadow-none placeholder:text-neutral-400 focus:border-black focus:ring-black sm:text-sm"
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
          Continue
        </Button>
      </div>
    </div>
  );
}
