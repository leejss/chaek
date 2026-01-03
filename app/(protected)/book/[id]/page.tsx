import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { books } from "@/db/schema";
import { accessTokenConfig, verifyAccessJWT } from "@/lib/auth";
import { extractTOC } from "@/lib/book/serverMarkdown";
import type { Book } from "@/lib/book/types";
import { serverEnv } from "@/lib/env";
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
