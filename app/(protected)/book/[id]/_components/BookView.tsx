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
  status?: string;
}

export default function BookView({
  book,
  headings,
  markdownHtml,
  status,
}: BookViewProps) {
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
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-background rounded-2xl border border-neutral-200 overflow-hidden animate-in fade-in duration-700 relative">
      <div className="flex-none px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-background/80 backdrop-blur-sm z-20 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="group flex items-center text-neutral-500 hover:text-foreground transition-colors text-sm font-medium"
          >
            <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center mr-2 group-hover:bg-neutral-200 transition-colors">
              <ChevronLeft size={14} />
            </div>
            Back
          </button>

          <button
            className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-md"
            onClick={() => setShowMobileTOC(!showMobileTOC)}
          >
            <List size={18} />
          </button>
        </div>

        <div
          className="hidden md:flex items-center gap-2 text-sm text-neutral-500 font-medium opacity-0 animate-in fade-in duration-300 data-[visible=true]:opacity-100"
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
            className="text-xs h-8 px-3 bg-background hover:bg-neutral-100 border-neutral-300 text-neutral-600"
          >
            <Download size={14} className="mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden lg:block w-64 border-r border-neutral-200 bg-neutral-50 overflow-y-auto custom-scrollbar p-6">
          <div className="mb-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
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
                      ? "bg-brand-100 text-brand-900 font-medium"
                      : "text-neutral-600 hover:text-foreground hover:bg-neutral-100"
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
          <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm lg:hidden flex flex-col p-6 animate-in slide-in-from-top-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">Contents</h3>
              <button
                onClick={() => setShowMobileTOC(false)}
                className="p-2 hover:bg-neutral-100 rounded-full text-foreground"
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
                        ? "bg-brand-100 border-brand-200 text-brand-900 font-medium"
                        : "bg-background border-neutral-200 text-neutral-600"
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
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative bg-background"
        >
          <div className="max-w-3xl mx-auto px-8 py-12 md:py-20">
            <div className="mb-12 text-center border-b border-neutral-200 pb-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                {status && (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      status === "generating"
                        ? "bg-amber-100 text-amber-700"
                        : status === "completed"
                        ? "bg-green-100 text-green-700"
                        : status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
                {book.title}
              </h1>
              <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs uppercase tracking-widest font-medium">
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

            <div className="prose prose-lg max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-neutral-700">
              {markdownHtml}

              <div className="mt-24 pt-12 border-t border-neutral-200 flex justify-center flex-col items-center">
                <div className="text-neutral-400 mb-4">
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
                <p className="text-neutral-500 text-sm italic">End of Book</p>
              </div>
            </div>
          </div>

          <div
            className={`
            lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-20 
            bg-white/90 backdrop-blur shadow-lg border border-neutral-200 rounded-full px-4 py-2 
            flex items-center gap-2 text-sm font-medium text-foreground
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
