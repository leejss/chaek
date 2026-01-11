"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { books, BookStatus, chapters } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { BookGenerationSettings } from "@/context/types/settings";
import { ChapterOutline } from "@/context/types/book";

export async function createBookAction(
  title: string,
  tableOfContents: string[],
  sourceText?: string,
  generationSettings?: BookGenerationSettings,
) {
  const userId = await getUserId();

  const result = await db
    .insert(books)
    .values({
      userId,
      title,
      content: "",
      tableOfContents,
      sourceText: sourceText ?? undefined,
      status: "waiting",
      generationSettings: generationSettings ?? undefined,
    })
    .returning({ id: books.id });

  const inserted = result[0];
  if (!inserted) {
    throw new Error("Failed to create book");
  }

  redirect(`/book/new/${inserted.id}`);
}

export async function updateBookAction(
  bookId: string,
  data: {
    content?: string;
    status?: BookStatus;
  },
) {
  const userId = await getUserId();

  await db
    .update(books)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(books.id, bookId), eq(books.userId, userId)));
}

export async function saveChapterAction(
  bookId: string,
  chapterNumber: number,
  title: string,
  content: string,
  outline: ChapterOutline,
) {
  const userId = await getUserId();

  // 1. Save chapter
  await db
    .insert(chapters)
    .values({
      bookId,
      chapterNumber,
      title,
      content,
      outline,
      status: "completed",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [chapters.bookId, chapters.chapterNumber],
      set: {
        content,
        outline,
        status: "completed",
        updatedAt: new Date(),
      },
    });

  // 2. Update book content by aggregating all chapters
  const allChapters = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.chapterNumber));

  const fullContent = allChapters.map((c) => c.content).join("\n\n");

  await db
    .update(books)
    .set({
      content: fullContent,
      currentChapterIndex: chapterNumber,
      status: "generating",
      updatedAt: new Date(),
    })
    .where(and(eq(books.id, bookId), eq(books.userId, userId)));
}
