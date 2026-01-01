import { db } from "@/db";
import { books } from "@/db/schema";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Book } from "@/lib/book/types";
import GenerationView from "./_components/GenerationView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookGenerationPage({ params }: PageProps) {
  const { id: bookId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenConfig.name)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  const { userId } = await verifyAccessJWT(accessToken, secret);

  const foundBooks = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (foundBooks.length === 0) {
    notFound();
  }

  const bookData = foundBooks[0];

  if (bookData.status === "completed") {
    redirect(`/book/${bookId}`);
  }

  const book: Book = {
    id: bookData.id,
    title: bookData.title,
    content: bookData.content || "",
    tableOfContents: bookData.tableOfContents || [],
    sourceText: bookData.sourceText || undefined,
    createdAt: bookData.createdAt.toISOString(),
  };

  return <GenerationView initialBook={book} />;
}
