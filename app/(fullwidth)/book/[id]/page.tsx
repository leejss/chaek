import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { bookGenerationStates, books } from "@/db/schema";
import { accessTokenConfig, verifyAccessJWT } from "@/lib/auth";
import { extractTOC } from "@/lib/serverMarkdown";
import type { Book } from "@/context/types/book";
import { serverEnv } from "@/lib/env";
import { aggregateBookContent } from "@/lib/repositories/bookRepository";
import BookView from "./_components/BookView";
import BookMarkdown from "./_components/BookMarkdown";

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
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (foundBooks.length === 0) {
    notFound();
  }

  const row = foundBooks[0];
  const bookData = row?.book;
  const state = row?.state;
  if (!bookData) {
    notFound();
  }

  const status = state?.status ?? "waiting";

  // If status is not completed, we aggregate chapters from DB to show current progress.
  // For completed books, we can trust bookData.content as a cache.
  const content =
    status !== "completed"
      ? await aggregateBookContent(bookData.id)
      : bookData.content;

  const book: Book = {
    id: bookData.id,
    title: bookData.title,
    content: content || bookData.content,
    tableOfContents: bookData.tableOfContents || [],
    sourceText: bookData.sourceText || undefined,
    createdAt: bookData.createdAt.toISOString(),
    status,
  };

  const headings = extractTOC(book.content);
  const markdownHtml = <BookMarkdown content={book.content} />;

  return (
    <BookView
      book={book}
      headings={headings}
      markdownHtml={markdownHtml}
      status={book.status}
    />
  );
}
