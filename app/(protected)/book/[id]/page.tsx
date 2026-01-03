import { and, eq } from "drizzle-orm";
import parse from "html-react-parser";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { db } from "@/db";
import { books } from "@/db/schema";
import { accessTokenConfig, verifyAccessJWT } from "@/lib/auth";
import { extractTOC, highlightCode } from "@/lib/book/serverMarkdown";
import type { Book } from "@/lib/book/types";
import { serverEnv } from "@/lib/env";
import BookView from "./_components/BookView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenConfig.name)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  const { userId } = await verifyAccessJWT(accessToken, secret);

  const { id: bookId } = await params;

  const foundBooks = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (foundBooks.length === 0) {
    notFound();
  }

  const bookData = foundBooks[0];

  const book: Book = {
    id: bookData.id,
    title: bookData.title,
    content: bookData.content,
    tableOfContents: bookData.tableOfContents || [],
    sourceText: bookData.sourceText || undefined,
    createdAt: bookData.createdAt.toISOString(),
    status: bookData.status,
  };

  const headings = extractTOC(book.content);

  type MarkdownProps = {
    children?: ReactNode;
    className?: string;
    [key: string]: unknown;
  };

  const components = {
    h1: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h1
          id={`heading-${text}`}
          data-heading-text={text}
          className="text-4xl font-bold mt-8 mb-6 text-brand-900 border-b border-brand-100 pb-4 scroll-mt-24"
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h2
          id={`heading-${text}`}
          data-heading-text={text}
          className="text-2xl font-semibold mt-8 mb-4 text-ink-900 scroll-mt-24"
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h3
          id={`heading-${text}`}
          data-heading-text={text}
          className="text-xl font-medium mt-6 mb-3 text-ink-800 scroll-mt-24"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ ...props }: MarkdownProps) => (
      <h4 className="text-lg font-semibold mt-6 mb-2 text-ink-800" {...props} />
    ),
    h5: ({ ...props }: MarkdownProps) => (
      <h5
        className="text-base font-bold mt-4 mb-2 text-ink-700 uppercase tracking-wide"
        {...props}
      />
    ),
    p: ({ ...props }: MarkdownProps) => (
      <p className="leading-loose mb-4 text-lg" {...props} />
    ),
    ul: ({ ...props }: MarkdownProps) => (
      <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
    ),
    ol: ({ ...props }: MarkdownProps) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
    ),
    blockquote: ({ ...props }: MarkdownProps) => (
      <blockquote
        className="border-l-4 border-accent-500 pl-4 italic text-ink-400 my-6"
        {...props}
      />
    ),
    code: async ({ className, children, ...props }: MarkdownProps) => {
      const content = String(children).replace(/\n$/, "");
      const match = /language-(\w+)/.exec(className || "");

      if (!match && !content.includes("\n")) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-stone-100 text-rose-600 font-mono text-[0.9em] border border-stone-200"
            {...props}
          >
            {children}
          </code>
        );
      }

      const html = await highlightCode(content, match?.[1] || "text");

      return (
        <div className="relative my-6 group">
          <div className="absolute right-3 top-3 text-xs text-stone-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase">
            {match?.[1]}
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden text-sm">
            {parse(html)}
          </div>
        </div>
      );
    },
    pre: ({ children }: MarkdownProps) => <>{children}</>,
  } as unknown as Components;

  const markdownHtml = (
    <div className="prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-p:text-stone-700">
      <ReactMarkdown components={components}>{book.content}</ReactMarkdown>
    </div>
  );

  return (
    <BookView
      book={book}
      headings={headings}
      markdownHtml={markdownHtml}
      status={book.status}
    />
  );
}
