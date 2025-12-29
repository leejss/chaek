"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Download, List, AlignLeft } from "lucide-react";
import Button from "@/app/(protected)/book/_components/Button";
import { Book } from "@/lib/book/types";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface BookViewProps {
  book: Book;
  headings: TOCItem[];
  markdownHtml: React.ReactNode;
}

export default function BookView({ book, headings, markdownHtml }: BookViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeText, setActiveText] = useState<string>("");
  const [showMobileTOC, setShowMobileTOC] = useState(false);

  useEffect(() => {
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries = entries.filter(
          (entry) => entry.isIntersecting,
        );

        if (intersectingEntries.length > 0) {
          const sortedEntries = intersectingEntries.sort((a, b) => {
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

          const topEntry = sortedEntries[0];
          const text = topEntry.target.getAttribute("data-heading-text");
          if (text) {
            setActiveText(text);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "200px 0px -65% 0px",
        threshold: 0,
      },
    );

    headings.forEach(({ text }) => {
      const element = document.querySelector(
        `[data-heading-text="${CSS.escape(text)}"]`,
      );
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleDownloadMarkdown = () => {
    if (!book.content) return;

    const contentWithTitle = `# ${book.title}\n\n${book.content}`;
    const blob = new Blob([contentWithTitle], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.title || "generated-book"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollToSection = (text: string) => {
    const element = document.querySelector(
      `[data-heading-text="${CSS.escape(text)}"]`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "instant", block: "start" });
      setActiveText(text);
      setShowMobileTOC(false);
    }
  };

  const activeHeading = headings.find((h) => h.text === activeText);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-[#fcfcfc] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.04)] border border-stone-200/60 overflow-hidden animate-in fade-in duration-700 relative">
      <div className="flex-none px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur-sm z-20 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="group flex items-center text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium"
          >
            <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center mr-2 group-hover:bg-stone-200 transition-colors">
              <ChevronLeft size={14} />
            </div>
            Back
          </button>

          <button
            className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-md"
            onClick={() => setShowMobileTOC(!showMobileTOC)}
          >
            <List size={18} />
          </button>
        </div>

        <div
          className="hidden md:flex items-center gap-2 text-sm text-stone-500 font-medium opacity-0 animate-in fade-in duration-300 data-[visible=true]:opacity-100"
          data-visible={!!activeHeading}
        >
          {activeHeading && (
            <>
              <AlignLeft size={14} className="text-brand-600" />
              <span className="max-w-[200px] truncate">
                {activeHeading.text}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadMarkdown}
            className="text-xs h-8 px-3 bg-white hover:bg-stone-50 border-stone-200 text-stone-600"
          >
            <Download size={14} className="mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden lg:block w-64 border-r border-stone-100 bg-stone-50/30 overflow-y-auto custom-scrollbar p-6">
          <div className="mb-4 text-xs font-bold text-stone-400 uppercase tracking-wider">
            Table of Contents
          </div>
          <nav className="space-y-1">
            {headings.map((heading, idx) => (
              <button
                key={`${heading.id}-${idx}`}
                onClick={() => scrollToSection(heading.text)}
                className={`
                  block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors
                  ${
                    activeText === heading.text
                      ? "bg-white text-brand-700 font-medium shadow-sm ring-1 ring-stone-200"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-100/50"
                  }
                  ${heading.level === 3 ? "pl-6 text-xs" : ""}
                `}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        </aside>

        {showMobileTOC && (
          <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm lg:hidden flex flex-col p-6 animate-in slide-in-from-top-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Contents
              </h3>
              <button
                onClick={() => setShowMobileTOC(false)}
                className="p-2 hover:bg-stone-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <nav className="space-y-2 overflow-y-auto flex-1">
              {headings.map((heading, idx) => (
                <button
                  key={`${heading.id}-${idx}`}
                  onClick={() => scrollToSection(heading.text)}
                  className={`
                    block w-full text-left py-3 px-4 rounded-lg border transition-all
                    ${
                      activeText === heading.text
                        ? "bg-brand-50 border-brand-200 text-brand-800 font-medium"
                        : "bg-white border-stone-100 text-stone-600"
                    }
                    ${heading.level === 3 ? "ml-4 w-[calc(100%-1rem)]" : ""}
                  `}
                >
                  {heading.text}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative"
        >
          <div className="max-w-3xl mx-auto px-8 py-12 md:py-20">
            <div className="mb-12 text-center border-b border-stone-100 pb-10">
              <h1 className="text-4xl md:text-5xl font-serif font-medium text-stone-900 mb-6 leading-tight">
                {book.title}
              </h1>
              <div className="flex items-center justify-center gap-2 text-stone-400 text-xs uppercase tracking-widest font-medium">
                <span>Generated Book</span>
                <span>•</span>
                <span>
                  {new Date(book.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-p:text-stone-700">
              {markdownHtml}

              <div className="mt-24 pt-12 border-t border-stone-100 flex justify-center flex-col items-center">
                <div className="text-stone-300 mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </div>
                <p className="text-stone-400 text-sm font-serif italic">
                  End of Book
                </p>
              </div>
            </div>
          </div>

          <div
            className={`
            lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-20 
            bg-white/90 backdrop-blur shadow-lg border border-stone-200 rounded-full px-4 py-2 
            flex items-center gap-2 text-sm font-medium text-stone-700
            transition-all duration-300
            ${
              activeHeading
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }
          `}
          >
            <AlignLeft size={14} className="text-brand-600" />
            <span className="max-w-[200px] truncate">
              {activeHeading?.text}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
