"use client";

import { BookOpen, FileText, List, Settings, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useGenerationStore } from "@/context/generationContext";
import type { BookGenerationSettings } from "@/lib/ai/schemas/settings";

interface StatusOverviewGenerationProps {
  bookTitle: string;
  sourceText: string;
  tableOfContents: string[];
  generationSettings: BookGenerationSettings;
  onCancel?: () => void;
  isGenerating?: boolean;
}

export default function StatusOverviewGeneration(props: StatusOverviewGenerationProps) {
  const { bookTitle, sourceText, tableOfContents, generationSettings, onCancel, isGenerating } =
    props;
  const [isOpen, setIsOpen] = useState(false);

  const generationProgress = useGenerationStore((state) => state.generationProgress);
  const bookPlan = useGenerationStore((state) => state.bookPlan);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed right-8 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-black bg-black text-white transition-colors hover:bg-neutral-800"
        title="현재 설정 및 진행 상황 확인"
      >
        <BookOpen size={24} />
        <span className="absolute right-full mr-3 whitespace-nowrap rounded bg-black px-3 py-1.5 font-bold text-white text-xs opacity-0 transition-opacity group-hover:opacity-100">
          STATUS
        </span>
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-100 flex items-end justify-end p-4 sm:p-8">
      <div className="slide-in-from-right-4 pointer-events-auto flex max-h-[80vh] w-full max-w-md animate-in flex-col rounded-xl border border-black bg-white duration-200">
        <div className="flex items-center justify-between rounded-t-xl border-neutral-100 border-b bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-black" />
            <h2 className="font-extrabold text-black uppercase tracking-tight">
              Generation Status
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 transition-colors hover:bg-neutral-100"
          >
            <X size={20} className="text-black" />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto bg-white p-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Settings size={16} className="text-black" />
              <h3 className="font-bold text-black text-xs uppercase tracking-widest">Settings</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">Language</p>
                <p className="font-bold text-black">{generationSettings.language}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">Chapters</p>
                <p className="font-bold text-black">{generationSettings.chapterCount}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">Provider</p>
                <p className="font-bold text-black uppercase">{generationSettings.provider}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">Model</p>
                <p className="font-bold text-black">{generationSettings.model}</p>
              </div>
              {generationSettings.userPreference && (
                <div className="col-span-2 rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">
                    Preference
                  </p>
                  <p className="line-clamp-2 font-bold text-black">
                    {generationSettings.userPreference}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} className="text-black" />
              <h3 className="font-bold text-black text-xs uppercase tracking-widest">Source</h3>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              {sourceText ? (
                <p className="line-clamp-4 font-medium text-neutral-900 text-sm leading-relaxed">
                  &quot;{sourceText}&quot;
                </p>
              ) : (
                <p className="font-medium text-neutral-400 text-sm italic">
                  No source text provided.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <List size={16} className="text-black" />
              <h3 className="font-bold text-black text-xs uppercase tracking-widest">
                Table of Contents
              </h3>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              {tableOfContents.length > 0 ? (
                <ul className="space-y-3">
                  {tableOfContents.map((item, idx) => (
                    <li key={idx} className="flex gap-3 font-medium text-black text-sm">
                      <span className="mt-0.5 font-mono text-neutral-400 text-xs">
                        {String(idx + 1).padStart(2, "0")}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-medium text-neutral-400 text-sm italic">
                  No table of contents generated.
                </p>
              )}
            </div>
          </section>

          {bookPlan && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-black" />
                <h3 className="font-bold text-black text-xs uppercase tracking-widest">Plan</h3>
              </div>
              <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
                <div>
                  <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">
                    Target Audience
                  </p>
                  <p className="font-bold text-black text-sm">{bookPlan.targetAudience}</p>
                </div>
                <div>
                  <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">
                    Writing Style
                  </p>
                  <p className="font-bold text-black text-sm">{bookPlan.writingStyle}</p>
                </div>
                <div>
                  <p className="mb-1 font-bold text-[10px] text-neutral-500 uppercase">
                    Key Themes
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {bookPlan.keyThemes.map((theme: string, idx: number) => (
                      <span
                        key={idx}
                        className="rounded bg-neutral-100 px-2 py-1 font-bold text-[11px] text-black"
                      >
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between rounded-b-xl border-neutral-100 border-t bg-white px-6 py-4">
          <span className="font-bold text-neutral-500 text-xs uppercase tracking-wide">
            {bookTitle || "Untitled Book"}
            <span className="ml-2 text-black">({generationProgress.phase})</span>
          </span>
          <div className="flex gap-4">
            {isGenerating && onCancel && (
              <button
                onClick={onCancel}
                className="font-extrabold text-red-600 text-xs uppercase tracking-widest transition-colors hover:text-red-700"
              >
                CANCEL
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="font-extrabold text-black text-xs uppercase tracking-widest transition-colors hover:text-neutral-700"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
