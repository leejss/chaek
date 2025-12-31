"use client";

import { useBookStore } from "@/lib/book/bookContext";
import { Language, useSettingsStore } from "@/lib/book/settingsStore";
import { ArrowRight, Cpu, Settings } from "lucide-react";
import Button from "../../_components/Button";

export default function SettingsStep() {
  const language = useSettingsStore((state) => state.language);
  const chapterCount = useSettingsStore((state) => state.chapterCount);
  const userPreference = useSettingsStore((state) => state.userPreference);
  const requireConfirm = useSettingsStore((state) => state.requireConfirm);
  const settingsActions = useSettingsStore((state) => state.actions);

  // const aiConfiguration = useBookStore((state) => state.aiConfiguration);
  const bookActions = useBookStore((state) => state.actions);

  // const selectedModel = aiConfiguration.toc.model as
  //   | GeminiModel
  //   | ClaudeModel
  //   | undefined;

  // const handleModelChange = (modelId: string) => {
  //   const providerId = getProviderByModel(modelId);
  //   if (providerId) {
  //     bookActions.setTocAiConfiguraiton(
  //       providerId,
  //       modelId as GeminiModel | ClaudeModel,
  //     );
  //   }
  // };

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    settingsActions.setChapterCount(val as number);
  };

  const toggleAutoChapters = (checked: boolean) => {
    if (checked) {
      settingsActions.setChapterCount("Auto");
    } else {
      settingsActions.setChapterCount(5);
    }
  };

  const handleContinue = () => {
    bookActions.goToStep("draft");
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Settings size={32} className="text-brand-600" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Book Settings
        </h2>
        <p className="text-neutral-600">
          Configure your book preferences before we begin.
        </p>
      </div>

      <div className="bg-background border border-neutral-200 rounded-2xl p-8 space-y-8">
        <div className="space-y-6">
          {/* AI Model Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-brand-600" />
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                AI Writer Model
              </h3>
            </div>
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AI_CONFIG.map((provider) => (
                <div key={provider.id} className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 px-1 uppercase">
                    {provider.name}
                  </label>
                  <div className="flex flex-col gap-2">
                    {provider.models.map((model) => {
                      const isSelected = selectedModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleModelChange(model.id)}
                          className={`
                            flex items-center justify-between p-3 rounded-sm border transition-all text-left
                            ${
                              isSelected
                                ? "bg-brand-50 border-brand-600 ring-1 ring-brand-600 shadow-sm"
                                : "bg-white border-stone-200 hover:border-stone-400"
                            }
                          `}
                        >
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-bold ${
                                isSelected ? "text-brand-900" : "text-stone-700"
                              }`}
                            >
                              {model.name}
                            </span>
                            <span className="text-[10px] text-stone-400 leading-tight mt-0.5">
                              {model.description}
                            </span>
                          </div>
                          {isSelected && (
                            <Check size={16} className="text-brand-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div> */}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Output Language
            </label>
            <select
              value={language}
              onChange={(e) =>
                settingsActions.setLanguage(e.target.value as Language)
              }
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
                onClick={() => settingsActions.setRequireConfirm(true)}
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
                onClick={() => settingsActions.setRequireConfirm(false)}
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
              onChange={(e) =>
                settingsActions.setUserPreference(e.target.value)
              }
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
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
