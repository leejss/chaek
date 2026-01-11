"use client";

interface CompletedViewProps {
  bookTitle: string;
  bookId: string;
}

export default function CompletedView({
  bookTitle,
  bookId,
}: CompletedViewProps) {
  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-black mb-4 tracking-tight">
          BOOK GENERATED
        </h1>
        <p className="text-neutral-500 font-medium mb-8">
          &ldquo;{bookTitle || "Untitled Book"}&rdquo; has been successfully
          created.
        </p>
        <a
          href={`/book/${bookId}`}
          className="inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold h-14 px-8 rounded-full text-lg transition-colors"
        >
          VIEW BOOK
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
