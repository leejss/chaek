"use client";

import {
  AlignLeft,
  ChevronLeft,
  Download,
  Home,
  List,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Button from "@/app/(protected)/_components/Button";
import type { Book } from "@/lib/book/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/utils/status";

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
  const router = useRouter();
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
    <div className="w-full h-full flex flex-col bg-background overflow-hidden animate-in fade-in duration-700 relative">
      <div className="flex-none px-4 py-2 border-b border-neutral-200 flex items-center justify-between bg-background/80 backdrop-blur-sm z-20 relative">
        <div className="flex items-center gap-2">
          <Link
            href="/book"
            className="group flex items-center justify-center w-10 h-10 rounded-full hover:bg-neutral-100 transition-colors"
            title="Go Home"
          >
            <Home size={20} className="text-foreground" />
          </Link>

          <button
            className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-full w-10 h-10 flex items-center justify-center"
            onClick={() => setShowMobileTOC(!showMobileTOC)}
          >
            <List size={20} />
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
          {(status === "failed" || status === "generating") && (
            <Button
              onClick={() => router.push(`/book/new/${book.id}`)}
              className="text-xs h-8 px-3 bg-brand-600 hover:bg-brand-700 text-white border-transparent"
            >
              <Play size={14} className="mr-2" />
              Resume Generation
            </Button>
          )}
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
        <aside className="hidden lg:block w-72 border-r border-neutral-200 bg-white overflow-y-auto custom-scrollbar p-8">
          <div className="mb-6 text-xs font-black text-black uppercase tracking-widest">
            Contents
          </div>
          <nav className="space-y-1">
            {headings.map((heading, idx) => (
              <button
                key={`${heading.id}-${idx}`}
                onClick={() => scrollToSection(heading.text)}
                className={`
                  block w-full text-left text-sm py-2 px-3 rounded-none border-l-2 transition-all
                  ${
                    activeText === heading.text
                      ? "border-black text-black font-bold bg-neutral-50"
                      : "border-transparent text-neutral-500 hover:text-black hover:border-neutral-300"
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
          <div className="absolute inset-0 z-30 bg-white lg:hidden flex flex-col p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-black tracking-tight uppercase">
                Contents
              </h3>
              <button
                onClick={() => setShowMobileTOC(false)}
                className="p-2 hover:bg-neutral-100 rounded-full text-black"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
            <nav className="space-y-0 overflow-y-auto flex-1">
              {headings.map((heading, idx) => (
                <button
                  key={`${heading.id}-${idx}`}
                  onClick={() => scrollToSection(heading.text)}
                  className={`
                    block w-full text-left py-4 px-4 border-b border-neutral-100 transition-all
                    ${
                      activeText === heading.text
                        ? "text-black font-bold bg-neutral-50"
                        : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                    }
                    ${heading.level === 3 ? "pl-8 text-sm" : "text-lg"}
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
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative bg-white"
        >
          <div className="max-w-3xl mx-auto px-8 py-16 md:py-24">
            <div className="mb-16 text-center border-b-4 border-black pb-12">
              <div className="flex items-center justify-center gap-2 mb-6">
                {status && (
                  <span
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-widest border border-black ${
                      status === "completed"
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                  >
                    {STATUS_LABELS[status] || status}
                  </span>
                )}
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-black mb-8 leading-none tracking-tighter uppercase">
                {book.title}
              </h1>
              <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm uppercase tracking-widest font-bold">
                {new Date(book.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </div>
            </div>

            <div className="prose prose-lg max-w-none prose-headings:font-black prose-p:leading-relaxed prose-p:text-neutral-900">
              {markdownHtml}

              <div className="mt-32 pt-16 border-t-4 border-black flex justify-center flex-col items-center">
                <div className="text-black mb-6">
                  <svg
                    width="32"
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
