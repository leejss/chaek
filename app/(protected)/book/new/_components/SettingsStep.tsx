"use client";

import {
  Language,
  settingsStoreActions,
  useSettingsStore,
} from "@/context/settingsStore";
import { cn } from "@/utils";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";
import { completeStep } from "@/context/bookStore";

export default function SettingsStep() {
  const router = useRouter();
  const language = useSettingsStore((state) => state.language);
  const chapterCount = useSettingsStore((state) => state.chapterCount);
  const userPreference = useSettingsStore((state) => state.userPreference);

  const { set } = settingsStoreActions;

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    set("chapterCount", val as number);
  };

  const toggleAutoChapters = (checked: boolean) => {
    if (checked) {
      set("chapterCount", "Auto");
    } else {
      set("chapterCount", 5);
    }
  };

  const handleContinue = () => {
    completeStep("settings");
    router.push("/book/new?step=source_input");
  };

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-black mb-4 tracking-tight">
          Settings
        </h2>
        <p className="text-neutral-500 font-medium">
          Configure your book preferences before we begin.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-8 space-y-10">
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="block font-bold text-black">
              Output Language
            </label>
            <select
              value={language}
              onChange={(e) => set("language", e.target.value as Language)}
              className="mt-1 block w-full rounded-lg border-neutral-200 bg-white text-black focus:border-black focus:ring-black sm:text-sm p-3 border font-medium"
            >
              <option value="Korean">Korean (한국어)</option>
              <option value="English">English</option>
            </select>
            <p className="text-xs text-neutral-500 font-medium">
              The language used for generating content.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-black">
                Chapter Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-chapters"
                  checked={chapterCount === "Auto"}
                  onChange={(e) => toggleAutoChapters(e.target.checked)}
                  className="rounded border-neutral-300 text-black focus:ring-black h-4 w-4"
                />
                <label
                  htmlFor="auto-chapters"
                  className="text-sm font-bold text-black"
                >
                  AUTO
                </label>
              </div>
            </div>

            <div
              className={cn(
                "transition-opacity",
                chapterCount === "Auto"
                  ? "opacity-40 pointer-events-none"
                  : "opacity-100",
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
                  className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-black"
                />
                <span className="text-sm font-bold w-10 text-center bg-black text-white py-1 rounded">
                  {chapterCount === "Auto" ? "Auto" : chapterCount}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-2">
                Range: 3 to 10 chapters
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block font-bold text-black">
              Custom Instructions
            </label>
            <textarea
              value={userPreference}
              onChange={(e) => set("userPreference", e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-xl border-neutral-200 bg-white text-black shadow-none focus:border-black focus:ring-black sm:text-sm p-4 border placeholder:text-neutral-400 font-medium resize-none"
              placeholder="E.g., Maintain a humorous tone, use simple analogies, focus on technical depth..."
            />
            <p className="text-xs text-neutral-500 font-medium">
              These instructions will be appended to the AI prompt for every
              generation.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button
          onClick={handleContinue}
          className="w-full md:w-auto h-14 px-12 text-lg font-bold rounded-full"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
