"use client";

import { useBookStore } from "@/lib/book/bookContext";
import { useSettingsStore } from "@/lib/book/settingsStore";
import { X, Settings, FileText, List, Sparkles, BookOpen } from "lucide-react";
import { useState } from "react";

export default function StatusOverview() {
  const [isOpen, setIsOpen] = useState(false);
  const flowStatus = useBookStore((state) => state.flowStatus);
  const sourceText = useBookStore((state) => state.sourceText);
  const tableOfContents = useBookStore((state) => state.tableOfContents);
  const bookPlan = useBookStore((state) => state.bookPlan);
  const aiConfiguration = useBookStore((state) => state.aiConfiguration);

  const language = useSettingsStore((state) => state.language);
  const chapterCount = useSettingsStore((state) => state.chapterCount);
  const userPreference = useSettingsStore((state) => state.userPreference);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-brand-700 transition-all transform hover:scale-110 z-50 group"
        title="현재 설정 및 진행 상황 확인"
      >
        <BookOpen size={24} />
        <span className="absolute right-full mr-3 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          진행 상황 보기
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end p-4 sm:p-8 pointer-events-none">
      <div 
        className="w-full max-w-md bg-white border border-stone-200 shadow-2xl rounded-lg flex flex-col max-h-[80vh] pointer-events-auto animate-in slide-in-from-right-4 duration-300"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-brand-600" />
            <h2 className="font-bold text-stone-800">책 생성 정보 요약</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* 1. 기본 설정 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings size={16} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">기본 설정 (Settings)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-stone-50 p-3 rounded border border-stone-100">
                <p className="text-xs text-stone-400 mb-1">언어 (Language)</p>
                <p className="font-medium text-stone-700">{language}</p>
              </div>
              <div className="bg-stone-50 p-3 rounded border border-stone-100">
                <p className="text-xs text-stone-400 mb-1">챕터 수 (Chapters)</p>
                <p className="font-medium text-stone-700">{chapterCount}</p>
              </div>
              {userPreference && (
                <div className="col-span-2 bg-stone-50 p-3 rounded border border-stone-100">
                  <p className="text-xs text-stone-400 mb-1">추가 요청사항 (Preferences)</p>
                  <p className="font-medium text-stone-700 line-clamp-2">{userPreference}</p>
                </div>
              )}
            </div>
          </section>

          {/* 2. 원문 소스 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">원문 소스 (Source Material)</h3>
            </div>
            <div className="bg-stone-50 p-3 rounded border border-stone-100">
              {sourceText ? (
                <p className="text-sm text-stone-600 line-clamp-4 leading-relaxed italic">
                  "{sourceText}"
                </p>
              ) : (
                <p className="text-sm text-stone-400 italic">입력된 소스가 없습니다.</p>
              )}
            </div>
          </section>

          {/* 3. 차례 (TOC) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <List size={16} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">차례 (Table of Contents)</h3>
            </div>
            <div className="bg-stone-50 p-3 rounded border border-stone-100">
              {tableOfContents.length > 0 ? (
                <ul className="space-y-2">
                  {tableOfContents.map((item, idx) => (
                    <li key={idx} className="text-sm text-stone-700 flex gap-2">
                      <span className="text-stone-400 font-mono text-xs mt-0.5">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-400 italic">생성된 차례가 없습니다.</p>
              )}
            </div>
          </section>

          {/* 4. AI 설정 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">AI 설정 (AI Config)</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-stone-50 p-3 rounded border border-stone-100">
                <p className="text-xs text-stone-400 mb-1">차례 생성 (TOC Generation)</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-stone-700 uppercase">{aiConfiguration.toc.provider}</span>
                  <span className="text-xs bg-stone-200 px-2 py-0.5 rounded text-stone-600 font-mono">
                    {aiConfiguration.toc.model}
                  </span>
                </div>
              </div>
              <div className="bg-stone-50 p-3 rounded border border-stone-100">
                <p className="text-xs text-stone-400 mb-1">본문 생성 (Content Generation)</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-stone-700 uppercase">{aiConfiguration.content.provider}</span>
                  <span className="text-xs bg-stone-200 px-2 py-0.5 rounded text-stone-600 font-mono">
                    {aiConfiguration.content.model}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. 책 기획 (Plan) - 있는 경우에만 표시 */}
          {bookPlan && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-stone-400" />
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">책 기획 (Book Plan)</h3>
              </div>
              <div className="bg-stone-50 p-3 rounded border border-stone-100 space-y-3">
                <div>
                  <p className="text-xs text-stone-400 mb-1">대상 독자 (Target Audience)</p>
                  <p className="text-sm text-stone-600">{bookPlan.targetAudience}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">집필 스타일 (Writing Style)</p>
                  <p className="text-sm text-stone-600">{bookPlan.writingStyle}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">핵심 테마 (Key Themes)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bookPlan.keyThemes.map((theme, idx) => (
                      <span key={idx} className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded text-stone-500">
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-lg flex justify-between items-center">
          <span className="text-xs text-stone-400">현재 단계: <span className="text-brand-600 font-bold uppercase">{flowStatus.replace("_", " ")}</span></span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase tracking-widest"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

