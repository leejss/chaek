import { db } from "@/db";
import { publishedBooks } from "@/db/schema";
import { extractTOC } from "@/lib/serverMarkdown";
import type { Book } from "@/context/types/book";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import BookView from "../../book/[id]/_components/BookView";
import BookMarkdown from "../../book/[id]/_components/BookMarkdown";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublishedDetailPage({ params }: PageProps) {
  const { id } = await params;

  const found = await db
    .select()
    .from(publishedBooks)
    .where(eq(publishedBooks.id, id))
    .limit(1);

  const published = found[0];
  if (!published) {
    notFound();
  }

  const book: Book = {
    id: published.id,
    title: published.title,
    content: published.content,
    tableOfContents: [],
    createdAt: published.publishedAt.toISOString(),
    status: "completed",
  };

  const headings = extractTOC(book.content);
  const markdownHtml = <BookMarkdown content={book.content} />;

  return (
    <BookView
      book={book}
      headings={headings}
      markdownHtml={markdownHtml}
      status={book.status}
      isPublished
      canPublish={false}
      homeHref="/published"
    />
  );
}
