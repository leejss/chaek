import { db } from "@/db";
import { bookGenerationStates, books, chapters } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export async function aggregateBookContent(bookId: string) {
  const result = await db
    .select({ content: chapters.content })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.chapterNumber));

  return result.map((c) => c.content).join("\n\n");
}

export async function findBookByIdAndUserId(bookId: string, userId: string) {
  const result = await db
    .select()
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  return result[0] ?? null;
}
