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
      <div className="relative z-20 flex flex-none items-center justify-between border-neutral-100 border-b bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-1">
          <Link
            href={homeHref || "/book"}
            className="group flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-neutral-100"
            title="Go Home"
          >
            <Home size={18} className="text-neutral-600 group-hover:text-neutral-900" />
          </Link>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
            onClick={() => setShowMobileTOC(!showMobileTOC)}
          >
            <List size={18} />
          </button>
        </div>

        <div
          className="fade-in hidden animate-in items-center gap-2 text-neutral-400 text-sm opacity-0 duration-300 data-[visible=true]:opacity-100 md:flex"
          data-visible={!!activeHeading}
        >
          {activeHeading && <span className="max-w-[250px] truncate">{activeHeading.text}</span>}
        </div>

        <div className="flex items-center gap-2">
          {(status === "failed" || status === "generating") && (
            <Button
              onClick={() => router.push(`/book/new/${book.id}`)}
              className="h-8 border-transparent bg-neutral-900 px-3 text-white text-xs hover:bg-neutral-800"
            >
              <Play size={14} className="mr-2" />
              Resume
            </Button>
          )}
          {canPublish && status === "completed" && !localPublished && (
            <Button
              variant="outline"
              onClick={handlePublish}
              isLoading={isPublishing}
              className="h-8 border-neutral-200 bg-transparent px-3 text-neutral-600 text-xs hover:bg-neutral-50 hover:text-neutral-900"
            >
              <Upload size={14} className="mr-2" />
              Publish
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadMarkdown}
            className="h-8 border-neutral-200 bg-transparent px-3 text-neutral-600 text-xs hover:bg-neutral-50 hover:text-neutral-900"
          >
            <Download size={14} className="mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="custom-scrollbar hidden w-64 flex-none overflow-y-auto border-neutral-100 border-r bg-neutral-50/50 p-6 lg:block">
          <div className="mb-6 text-neutral-400 text-xs font-medium tracking-wide">Contents</div>
          <nav className="space-y-1">
            {headings.map((heading, idx) => (
              <button
                key={`${heading.id}-${idx}`}
                onClick={() => scrollToSection(heading.text)}
                className={`block w-full rounded-none border-l pl-4 pr-3 py-2 text-left text-sm transition-all ${
                  activeText === heading.text
                    ? "border-neutral-900 font-medium text-neutral-900"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }
                  ${heading.level === 3 ? "ml-2 text-xs" : ""}
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
              <h3 className="text-xl font-medium text-neutral-900">Contents</h3>
              <button
                onClick={() => setShowMobileTOC(false)}
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {headings.map((heading, idx) => (
                <button
                  key={`${heading.id}-${idx}`}
                  onClick={() => scrollToSection(heading.text)}
                  className={`block w-full rounded-md px-4 py-3 text-left transition-colors ${
                    activeText === heading.text
                      ? "bg-neutral-100 font-medium text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }
                    ${heading.level === 3 ? "pl-8 text-sm" : "text-base"}
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
          <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
            <div className="mb-20 text-center">
              <div className="mb-6 flex items-center justify-center gap-2">
                {status && (
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                    {STATUS_LABELS[status] || status}
                  </span>
                )}
                {localPublished && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                    Published
                  </span>
                )}
              </div>
              {publishError && (
                <div className="mb-6 text-sm font-medium text-red-500">{publishError}</div>
              )}
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl md:leading-tight">
                {book.title}
              </h1>
              <div className="text-sm font-medium text-neutral-400">
                {new Date(book.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            <div className="prose prose-neutral prose-lg max-w-none">
              {markdownHtml}

              <div className="mt-32 flex flex-col items-center justify-center pt-16">
                <div className="flex gap-2 mb-6">
                  <span className="w-1 h-1 rounded-full bg-neutral-300" />
                  <span className="w-1 h-1 rounded-full bg-neutral-300" />
                  <span className="w-1 h-1 rounded-full bg-neutral-300" />
                </div>
                <p className="text-neutral-400 text-sm">End of Document</p>
              </div>
            </div>
          </div>

          <div
            className={`fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-neutral-100 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm backdrop-blur transition-all duration-300 lg:hidden ${activeHeading ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
          `}
          >
            <span className="max-w-[200px] truncate">{activeHeading?.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
