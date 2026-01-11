"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookGenerationStates, books, BookStatus, chapters } from "@/db/schema";
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

  const inserted = await db.transaction(async (tx) => {
    const result = await tx
      .insert(books)
      .values({
        userId,
        title,
        content: "",
        tableOfContents,
        sourceText: sourceText ?? undefined,
        updatedAt: new Date(),
      })
      .returning({ id: books.id });

    const row = result[0];
    if (!row) return null;

    await tx.insert(bookGenerationStates).values({
      bookId: row.id,
      status: "waiting",
      generationSettings: generationSettings ?? undefined,
      updatedAt: new Date(),
    });

    return row;
  });

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

  await db.transaction(async (tx) => {
    const found = await tx
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (found.length === 0) {
      throw new Error("Book not found");
    }

    if (data.status) {
      await tx
        .insert(bookGenerationStates)
        .values({
          bookId,
          status: data.status,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [bookGenerationStates.bookId],
          set: {
            status: data.status,
            updatedAt: new Date(),
          },
        });
    }

    await tx
      .update(books)
      .set({
        ...(data.content ? { content: data.content } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)));
  });
}

export async function saveChapterAction(
  bookId: string,
  chapterNumber: number,
  title: string,
  content: string,
  outline: ChapterOutline,
) {
  const userId = await getUserId();

  const bookFound = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (bookFound.length === 0) {
    throw new Error("Book not found");
  }

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

  await db.transaction(async (tx) => {
    await tx
      .insert(bookGenerationStates)
      .values({
        bookId,
        status: "generating",
        currentChapterIndex: chapterNumber,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "generating",
          currentChapterIndex: chapterNumber,
          updatedAt: new Date(),
        },
      });

    await tx
      .update(books)
      .set({
        content: fullContent,
        updatedAt: new Date(),
      })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)));
  });
}
