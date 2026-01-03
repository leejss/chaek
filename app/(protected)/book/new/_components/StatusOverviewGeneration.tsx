"use client";

import { useState } from "react";
import { BookOpen, FileText, List, Settings, Sparkles, X } from "lucide-react";
import { useGenerationStore } from "@/lib/book/generationContext";

interface StatusOverviewGenerationProps {
  onCancel?: () => void;
  isGenerating?: boolean;
}

export default function StatusOverviewGeneration(
  props: StatusOverviewGenerationProps,
) {
  const { onCancel, isGenerating } = props;
  const [isOpen, setIsOpen] = useState(false);

  const bookTitle = useGenerationStore((state) => state.bookTitle);
  const sourceText = useGenerationStore((state) => state.sourceText);
  const tableOfContents = useGenerationStore((state) => state.tableOfContents);
  const bookPlan = useGenerationStore((state) => state.bookPlan);
  const generationSettings = useGenerationStore(
    (state) => state.generationSettings,
  );
  const generationProgress = useGenerationStore(
    (state) => state.generationProgress,
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center hover:bg-neutral-800 transition-colors z-50 group border border-black"
        title="현재 설정 및 진행 상황 확인"
      >
        <BookOpen size={24} />
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-black text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          STATUS
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-end p-4 sm:p-8 pointer-events-none">
      <div className="w-full max-w-md bg-white border border-black rounded-xl flex flex-col max-h-[80vh] pointer-events-auto animate-in slide-in-from-right-4 duration-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-black" />
            <h2 className="font-extrabold text-black uppercase tracking-tight">
              Generation Status
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X size={20} className="text-black" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings size={16} className="text-black" />
              <h3 className="text-xs font-bold text-black uppercase tracking-widest">
                Settings
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded-lg border border-neutral-200">
                <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                  Language
                </p>
                <p className="font-bold text-black">
                  {generationSettings.language}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-neutral-200">
                <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                  Chapters
                </p>
                <p className="font-bold text-black">
                  {generationSettings.chapterCount}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-neutral-200">
                <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                  Provider
                </p>
                <p className="font-bold text-black uppercase">
                  {generationSettings.provider}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-neutral-200">
                <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                  Model
                </p>
                <p className="font-bold text-black">
                  {generationSettings.model}
                </p>
              </div>
              {generationSettings.userPreference && (
                <div className="col-span-2 bg-white p-3 rounded-lg border border-neutral-200">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                    Preference
                  </p>
                  <p className="font-bold text-black line-clamp-2">
                    {generationSettings.userPreference}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-black" />
              <h3 className="text-xs font-bold text-black uppercase tracking-widest">
                Source
              </h3>
            </div>
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              {sourceText ? (
                <p className="text-sm text-neutral-900 font-medium line-clamp-4 leading-relaxed">
                  &quot;{sourceText}&quot;
                </p>
              ) : (
                <p className="text-sm text-neutral-400 font-medium italic">
                  No source text provided.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <List size={16} className="text-black" />
              <h3 className="text-xs font-bold text-black uppercase tracking-widest">
                Table of Contents
              </h3>
            </div>
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              {tableOfContents.length > 0 ? (
                <ul className="space-y-3">
                  {tableOfContents.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-black font-medium flex gap-3"
                    >
                      <span className="text-neutral-400 font-mono text-xs mt-0.5">
                        {String(idx + 1).padStart(2, "0")}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400 font-medium italic">
                  No table of contents generated.
                </p>
              )}
            </div>
          </section>

          {bookPlan && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-black" />
                <h3 className="text-xs font-bold text-black uppercase tracking-widest">
                  Plan
                </h3>
              </div>
              <div className="bg-white p-4 rounded-lg border border-neutral-200 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                    Target Audience
                  </p>
                  <p className="text-sm font-bold text-black">
                    {bookPlan.targetAudience}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                    Writing Style
                  </p>
                  <p className="text-sm font-bold text-black">
                    {bookPlan.writingStyle}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 mb-1 uppercase">
                    Key Themes
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {bookPlan.keyThemes.map((theme: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[11px] font-bold bg-neutral-100 px-2 py-1 rounded text-black"
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

        <div className="px-6 py-4 border-t border-neutral-100 bg-white rounded-b-xl flex justify-between items-center">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
            {bookTitle || "Untitled Book"}
            <span className="ml-2 text-black">
              ({generationProgress.phase})
            </span>
          </span>
          <div className="flex gap-4">
            {isGenerating && onCancel && (
              <button
                onClick={onCancel}
                className="text-xs font-extrabold text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest"
              >
                CANCEL
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-extrabold text-black hover:text-neutral-700 transition-colors uppercase tracking-widest"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
