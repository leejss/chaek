"use client";

import { AlignLeft, ChevronLeft, Download, Home, List, Play, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import type { Book } from "@/context/types/book";
import { publishBookAction } from "@/lib/actions/book";
import { STATUS_LABELS } from "@/utils/status";

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
  isPublished?: boolean;
  canPublish?: boolean;
  homeHref?: string;
}

export default function BookView({
  book,
  headings,
  markdownHtml,
  status,
  isPublished,
  canPublish,
  homeHref,
}: BookViewProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeText, setActiveText] = useState<string>("");
  const [showMobileTOC, setShowMobileTOC] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [localPublished, setLocalPublished] = useState(!!isPublished);

  useEffect(() => {
    setLocalPublished(!!isPublished);
  }, [isPublished]);

  useEffect(() => {
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries = entries.filter((entry) => entry.isIntersecting);

        if (intersectingEntries.length > 0) {
          const sortedEntries = intersectingEntries.sort((a, b) => {
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

          const topEntry = sortedEntries[0];
          if (!topEntry) return;
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
      const element = document.querySelector(`[data-heading-text="${CSS.escape(text)}"]`);
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

  const handlePublish = async () => {
    if (isPublishing || localPublished) return;
    const confirmed = window.confirm("Publish this book?");
    if (!confirmed) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await publishBookAction(book.id);
      if (!result?.ok) {
        throw new Error("Failed to publish");
      }
      setLocalPublished(true);
      router.refresh();
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const scrollToSection = (text: string) => {
    const element = document.querySelector(`[data-heading-text="${CSS.escape(text)}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "instant", block: "start" });
      setActiveText(text);
      setShowMobileTOC(false);
    }
  };

  const activeHeading = headings.find((h) => h.text === activeText);

  return (
    <div className="fade-in relative flex h-full w-full animate-in flex-col overflow-hidden bg-background duration-700">
      <div className="relative z-20 flex flex-none items-center justify-between border-neutral-200 border-b bg-background/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Link
            href={homeHref || "/book"}
            className="group flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
            title="Go Home"
          >
            <Home size={20} className="text-foreground" />
          </Link>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-full p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
            onClick={() => setShowMobileTOC(!showMobileTOC)}
          >
            <List size={20} />
          </button>
        </div>

        <div
          className="fade-in hidden animate-in items-center gap-2 font-medium text-neutral-500 text-sm opacity-0 duration-300 data-[visible=true]:opacity-100 md:flex"
          data-visible={!!activeHeading}
        >
          {activeHeading && (
            <>
              <AlignLeft size={14} className="text-brand-600" />
              <span className="max-w-[200px] truncate">{activeHeading.text}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(status === "failed" || status === "generating") && (
            <Button
              onClick={() => router.push(`/book/new/${book.id}`)}
              className="h-8 border-transparent bg-brand-600 px-3 text-white text-xs hover:bg-brand-700"
            >
              <Play size={14} className="mr-2" />
              Resume Generation
            </Button>
          )}
          {canPublish && status === "completed" && !localPublished && (
            <Button
              variant="outline"
              onClick={handlePublish}
              isLoading={isPublishing}
              className="h-8 border-neutral-300 bg-background px-3 text-neutral-600 text-xs hover:bg-neutral-100"
            >
              <Upload size={14} className="mr-2" />
              Publish
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadMarkdown}
            className="h-8 border-neutral-300 bg-background px-3 text-neutral-600 text-xs hover:bg-neutral-100"
          >
            <Download size={14} className="mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="custom-scrollbar hidden w-72 overflow-y-auto border-neutral-200 border-r bg-white p-8 lg:block">
          <div className="mb-6 font-black text-black text-xs uppercase tracking-widest">
            Contents
          </div>
          <nav className="space-y-1">
            {headings.map((heading, idx) => (
              <button
                key={`${heading.id}-${idx}`}
                onClick={() => scrollToSection(heading.text)}
                className={`block w-full rounded-none border-l-2 px-3 py-2 text-left text-sm transition-all ${
                  activeText === heading.text
                    ? "border-black bg-neutral-50 font-bold text-black"
                    : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-black"
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
          <div className="slide-in-from-bottom-10 absolute inset-0 z-30 flex animate-in flex-col bg-white p-6 lg:hidden">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="font-black text-2xl text-black uppercase tracking-tight">Contents</h3>
              <button
                onClick={() => setShowMobileTOC(false)}
                className="rounded-full p-2 text-black hover:bg-neutral-100"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-0 overflow-y-auto">
              {headings.map((heading, idx) => (
                <button
                  key={`${heading.id}-${idx}`}
                  onClick={() => scrollToSection(heading.text)}
                  className={`block w-full border-neutral-100 border-b px-4 py-4 text-left transition-all ${
                    activeText === heading.text
                      ? "bg-neutral-50 font-bold text-black"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-black"
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
          className="custom-scrollbar relative flex-1 overflow-y-auto scroll-smooth bg-white"
        >
          <div className="mx-auto max-w-3xl px-8 py-16 md:py-24">
            <div className="mb-16 border-black border-b-4 pb-12 text-center">
              <div className="mb-6 flex items-center justify-center gap-2">
                {status && (
                  <span
                    className={`border border-black px-3 py-1 font-bold text-xs uppercase tracking-widest ${
                      status === "completed" ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {STATUS_LABELS[status] || status}
                  </span>
                )}
                {localPublished && (
                  <span className="border border-black bg-white px-3 py-1 font-bold text-black text-xs uppercase tracking-widest">
                    Published
                  </span>
                )}
              </div>
              {publishError && (
                <div className="mb-6 font-bold text-red-600 text-xs uppercase tracking-widest">
                  {publishError}
                </div>
              )}
              <h1 className="mb-8 font-black text-3xl text-black uppercase leading-none tracking-tighter md:text-5xl">
                {book.title}
              </h1>
              <div className="flex items-center justify-center gap-2 font-bold text-neutral-500 text-sm uppercase tracking-widest">
                {new Date(book.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </div>
            </div>

            <div className="prose prose-lg max-w-none prose-headings:font-black prose-p:text-neutral-900 prose-p:leading-relaxed">
              {markdownHtml}

              <div className="mt-32 flex flex-col items-center justify-center border-black border-t-4 pt-16">
                <div className="mb-6 text-black">
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
            className={`fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-4 py-2 font-medium text-foreground text-sm shadow-lg backdrop-blur transition-all duration-300 lg:hidden ${activeHeading ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
          `}
          >
            <AlignLeft size={14} className="text-brand-600" />
            <span className="max-w-[200px] truncate">{activeHeading?.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
