"use client";

import Link from "next/link";
import Button from "../../_components/Button";
import { useBookStore } from "@/lib/book/bookContext";
import { useGenerationStore } from "@/lib/book/generationContext";

export default function CompletedStep() {
  const bookStore = useBookStore();
  const genStore = useGenerationStore();

  const savedBookId = genStore.savedBookId;
  const tableOfContents = bookStore.tableOfContents;
  const content = genStore.content;
  const actions = bookStore.actions;

  const handleNew = () => {
    actions.startNewBook();
  };

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-8">
      <div className="border-2 border-neutral-200 bg-white rounded-xl p-8">
        <p className="uppercase text-xs font-bold tracking-widest text-black mb-4">
          Flow Status
        </p>
        <h1 className="font-extrabold text-4xl text-black mb-4 tracking-tight">
          All Chapters Completed
        </h1>
        <p className="text-neutral-500 font-medium leading-relaxed text-lg">
          Your book has been generated and automatically saved. You can review
          the results below or start creating a new book.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          {savedBookId && (
            <Button
              asChild
              className="h-12 px-6 font-bold text-sm uppercase tracking-wide rounded-full"
            >
              <Link href={`/book/${savedBookId}`}>View Saved Book</Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            className="h-12 px-6 font-bold text-sm uppercase tracking-wide rounded-full border-2"
          >
            <Link href="/book">Go to Library</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={handleNew}
            className="h-12 px-6 font-bold text-sm uppercase tracking-wide rounded-full"
          >
            Create New Book
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border-2 border-neutral-200 bg-white rounded-xl p-6">
          <p className="uppercase text-xs font-bold tracking-widest text-black mb-4">
            Table of Contents
          </p>
          {tableOfContents.length > 0 ? (
            <ol className="space-y-3 text-black">
              {tableOfContents.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-neutral-400 font-mono text-xs w-6 mt-1 font-bold">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-bold text-sm leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-neutral-400 font-medium italic text-sm">
              No table of contents available.
            </p>
          )}
        </div>

        <div className="border-2 border-neutral-200 bg-white rounded-xl p-6">
          <p className="uppercase text-xs font-bold tracking-widest text-black mb-4">
            Preview
          </p>
          {content ? (
            <div className="prose prose-sm max-w-none text-neutral-600 font-medium">
              <p className="line-clamp-12 whitespace-pre-line">{content}</p>
            </div>
          ) : (
            <p className="text-neutral-400 font-medium italic text-sm">
              No content available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
