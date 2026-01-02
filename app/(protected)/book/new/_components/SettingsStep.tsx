"use client";

import {
  Language,
  settingsStoreActions,
  useSettingsStore,
} from "@/lib/book/settingsStore";
import Button from "../../_components/Button";
import { bookStoreActions } from "@/lib/book/bookContext";

export default function SettingsStep() {
  const language = useSettingsStore((state) => state.language);
  const chapterCount = useSettingsStore((state) => state.chapterCount);
  const userPreference = useSettingsStore((state) => state.userPreference);
  const requireConfirm = useSettingsStore((state) => state.requireConfirm);

  const { goToStep } = bookStoreActions;
  const { setChapterCount, setLanguage, setUserPreference, setRequireConfirm } =
    settingsStoreActions;

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
    goToStep("source_input");
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-3">Settings</h2>
        <p className="text-neutral-600">
          Configure your book preferences before we begin.
        </p>
      </div>

      <div className="bg-background border border-neutral-200 rounded-2xl p-8 space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Output Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="mt-1 block w-full rounded-lg border-neutral-300 bg-white text-foreground shadow-sm focus:border-brand-600 focus:ring-brand-600 sm:text-sm p-2 border"
            >
              <option value="Korean">Korean (한국어)</option>
              <option value="English">English</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="Chinese">Chinese (中文)</option>
            </select>
            <p className="text-xs text-neutral-600">
              The language used for generating content.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Chapter Review Mode
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRequireConfirm(true)}
                className={`
                  flex-1 px-4 py-3 rounded-xl border transition-all text-sm text-left
                  ${
                    requireConfirm
                      ? "bg-brand-50 border-brand-600 ring-1 ring-brand-600 shadow-sm text-brand-700"
                      : "bg-background border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }
                `}
              >
                <div className="font-bold text-foreground">
                  Review Each Chapter
                </div>
                <div className="text-xs mt-1 opacity-75">
                  Confirm each chapter before proceeding
                </div>
              </button>
              <button
                onClick={() => setRequireConfirm(false)}
                className={`
                  flex-1 px-4 py-3 rounded-xl border transition-all text-sm text-left
                  ${
                    !requireConfirm
                      ? "bg-brand-50 border-brand-600 ring-1 ring-brand-600 shadow-sm text-brand-700"
                      : "bg-background border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }
                `}
              >
                <div className="font-bold text-foreground">Auto-Generate</div>
                <div className="text-xs mt-1 opacity-75">
                  Generate entire book automatically
                </div>
              </button>
            </div>
            <p className="text-xs text-neutral-600">
              Choose whether to review chapters one by one or generate all at
              once.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-foreground">
                Chapter Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-chapters"
                  checked={chapterCount === "Auto"}
                  onChange={(e) => toggleAutoChapters(e.target.checked)}
                  className="rounded border-neutral-300 bg-white text-brand-600 focus:ring-brand-600 h-4 w-4"
                />
                <label
                  htmlFor="auto-chapters"
                  className="text-sm text-neutral-600"
                >
                  Auto
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
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="text-sm font-bold w-8 text-center bg-neutral-100 text-foreground py-1 rounded">
                  {chapterCount === "Auto" ? "Auto" : chapterCount}
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                Range: 3 to 10 chapters
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Custom Instructions
            </label>
            <textarea
              value={userPreference}
              onChange={(e) => setUserPreference(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-xl border-neutral-300 bg-white text-foreground shadow-sm focus:border-brand-600 focus:ring-brand-600 sm:text-sm p-3 border placeholder:text-neutral-500"
              placeholder="E.g., Maintain a humorous tone, use simple analogies, focus on technical depth..."
            />
            <p className="text-xs text-neutral-600">
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
        </Button>
      </div>
    </div>
  );
}
