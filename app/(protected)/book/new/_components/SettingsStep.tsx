"use client";

import { Settings, ArrowRight } from "lucide-react";
import Button from "../../_components/Button";
import { Language, useSettingsStore } from "@/lib/book/settingsStore";
import { useBookStore } from "@/lib/book/bookContext";

export default function SettingsStep() {
  const {
    language,
    chapterCount,
    userPreference,
    setLanguage,
    setChapterCount,
    setUserPreference,
  } = useSettingsStore();

  const { updateDraft } = useBookStore((state) => state.actions);

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setChapterCount(val as number);
  };

  const toggleAutoChapters = (checked: boolean) => {
    if (checked) {
      setChapterCount("Auto");
    } else {
      setChapterCount(5);
    }
  };

  const handleContinue = () => {
    updateDraft({ status: "draft" });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Settings size={32} className="text-brand-700" />
        </div>
        <h2 className="text-3xl font-serif text-brand-900 mb-3">
          Book Settings
        </h2>
        <p className="text-stone-500">
          Configure your book preferences before we begin.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-8 space-y-8 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">
              Output Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
            >
              <option value="Korean">Korean (한국어)</option>
              <option value="English">English</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="Chinese">Chinese (中文)</option>
            </select>
            <p className="text-xs text-stone-500">
              The language used for generating content.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-stone-700">
                Default Chapter Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-chapters"
                  checked={chapterCount === "Auto"}
                  onChange={(e) => toggleAutoChapters(e.target.checked)}
                  className="rounded border-stone-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <label
                  htmlFor="auto-chapters"
                  className="text-sm text-stone-600"
                >
                  Auto (AI Decides)
                </label>
              </div>
            </div>

            <div
              className={`transition-opacity ${
                chapterCount === "Auto"
                  ? "opacity-40 pointer-events-none"
                  : "opacity-100"
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={chapterCount === "Auto" ? 5 : chapterCount}
                  onChange={handleChapterCountChange}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="text-sm font-medium w-8 text-center bg-stone-100 py-1 rounded">
                  {chapterCount === "Auto" ? "Auto" : chapterCount}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Range: 3 to 10 chapters
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">
              Custom Instructions
            </label>
            <textarea
              value={userPreference}
              onChange={(e) => setUserPreference(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-3 border"
              placeholder="E.g., Maintain a humorous tone, use simple analogies, focus on technical depth..."
            />
            <p className="text-xs text-stone-500">
              These instructions will be appended to the AI prompt for every
              generation.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          className="w-full md:w-auto h-12 px-10 text-lg"
        >
          Continue
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
