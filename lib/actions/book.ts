"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookGenerationStates, books, BookStatus, chapters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ChapterOutline } from "@/context/types/book";
import { aggregateBookContent } from "@/lib/repositories/bookRepository";
import { BookGenerationSettings } from "../ai/schemas/settings";

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
      })
      .returning({ id: books.id });

    const row = result[0];
    if (!row) return null;

    await tx.insert(bookGenerationStates).values({
      bookId: row.id,
      status: "waiting",
      generationSettings: generationSettings ?? undefined,
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
        })
        .onConflictDoUpdate({
          target: [bookGenerationStates.bookId],
          set: {
            status: data.status,
          },
        });
    }

    // If status is completed, aggregate all chapters and update book content
    if (data.status === "completed") {
      const fullContent = await aggregateBookContent(bookId);
      await tx
        .update(books)
        .set({
          content: fullContent,
        })
        .where(and(eq(books.id, bookId), eq(books.userId, userId)));
    }
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
    })
    .onConflictDoUpdate({
      target: [chapters.bookId, chapters.chapterNumber],
      set: {
        content,
        outline,
        status: "completed",
      },
    });

  // 2. Update book content by aggregating all chapters
  const fullContent = await aggregateBookContent(bookId);

  await db.transaction(async (tx) => {
    await tx
      .insert(bookGenerationStates)
      .values({
        bookId,
        status: "generating",
        currentChapterIndex: chapterNumber,
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "generating",
          currentChapterIndex: chapterNumber,
        },
      });

    await tx
      .update(books)
      .set({
        content: fullContent,
      })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)));
  });
}
