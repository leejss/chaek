import { db } from "@/db";
import { chapters } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import type { ChapterStatus } from "@/db/schema";

export async function findChaptersByBookIdAndStatus(
  bookId: string,
  status: ChapterStatus,
) {
  return db
    .select({
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      content: chapters.content,
      outline: chapters.outline,
    })
    .from(chapters)
    .where(and(eq(chapters.bookId, bookId), eq(chapters.status, status)))
    .orderBy(asc(chapters.chapterNumber));
}
