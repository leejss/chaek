"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import {
  useSettingsStore,
  Language,
  ChapterCount,
} from "@/lib/book/settingsStore";
import { AI_CONFIG } from "@/lib/ai/config";

export default function SettingsPage() {
  const {
    language,
    chapterCount,
    defaultModel,
    userPreference,
    setLanguage,
    setChapterCount,
    setDefaultModel,
    setUserPreference,
  } = useSettingsStore();

  const handleChapterCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setChapterCount(val as number);
  };

  const toggleAutoChapters = (checked: boolean) => {
    if (checked) {
      setChapterCount("Auto");
    } else {
      setChapterCount(5); // Default start when switching off auto
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/book"
            className="text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-serif text-ink-900">Settings</h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-8 border border-stone-200">
          {/* Content Settings */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif text-brand-700 border-b border-stone-100 pb-2">
              Content Configuration
            </h2>

            <div className="grid gap-6">
              {/* Language */}
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

              {/* Chapter Count */}
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
            </div>
          </section>

          {/* AI Settings */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif text-brand-700 border-b border-stone-100 pb-2">
              AI Model
            </h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700">
                Default Model
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {AI_CONFIG.map((provider) => (
                  <div key={provider.id}>
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      {provider.name}
                    </div>
                    <div className="space-y-2">
                      {provider.models.map((model) => (
                        <div
                          key={model.id}
                          onClick={() => setDefaultModel(model.id)}
                          className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all ${
                            defaultModel === model.id
                              ? "border-brand-600 ring-1 ring-brand-600 bg-brand-50"
                              : "border-stone-300 hover:border-brand-400 bg-white"
                          }`}
                        >
                          <div className="flex flex-1">
                            <div className="flex flex-col">
                              <span
                                className={`block text-sm font-medium ${
                                  defaultModel === model.id
                                    ? "text-brand-900"
                                    : "text-stone-900"
                                }`}
                              >
                                {model.name}
                              </span>
                              <span
                                className={`mt-1 flex items-center text-xs ${
                                  defaultModel === model.id
                                    ? "text-brand-700"
                                    : "text-stone-500"
                                }`}
                              >
                                {model.description}
                              </span>
                            </div>
                          </div>
                          {defaultModel === model.id && (
                            <div className="shrink-0 text-brand-600">
                              <svg
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* User Preferences */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif text-brand-700 border-b border-stone-100 pb-2">
              Preferences
            </h2>

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
          </section>
        </div>
      </div>
    </div>
  );
}
