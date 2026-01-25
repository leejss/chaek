"use server";

import { ChapterOutline } from "@/context/types/book";
import { db } from "@/db";
import { bookGenerationStates, books, BookStatus, chapters } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import {
  aggregateBookContent,
  findBookByIdAndUserId,
} from "@/lib/repositories/bookRepository";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  BookGenerationSettings,
  BookGenerationSettingsSchema,
} from "../ai/schemas/settings";
import { ChapterOutlineSchema } from "../ai/schemas/outline";
import { z } from "zod";

const CreateBookInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  tableOfContents: z
    .array(z.string().min(1, "TOC item cannot be empty"))
    .min(1, "At least one TOC item is required")
    .max(50, "Too many TOC items"),
  sourceText: z.string().max(100000, "Source text is too long"),
  generationSettings: BookGenerationSettingsSchema,
});

const SaveChapterInputSchema = z.object({
  bookId: z.string().uuid("Invalid book ID"),
  chapterNumber: z.number().int().positive("Chapter number must be positive"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z.string().max(500000, "Content is too long"),
  outline: ChapterOutlineSchema,
});

export async function getBookWithValidation(bookId: string, userId: string) {
  const data = await findBookByIdAndUserId(bookId, userId);
  if (!data?.books) {
    console.warn(`Book not found: ${bookId} for user ${userId}`);
    return null;
  }

  if (!data.book_generation_states) {
    console.warn(
      `Book generation state not found: ${bookId} for user ${userId}`,
    );
    return null;
  }

  const { books: book, book_generation_states: state } = data;
  const generationSettings = state?.generationSettings;

  const parsed = BookGenerationSettingsSchema.safeParse(generationSettings);
  if (!parsed.success) {
    throw new ValidationError(
      `Invalid generationSettings for book ${bookId}`,
      parsed.error.flatten().fieldErrors,
    );
  }

  return {
    ...book,
    status: state?.status,
    currentChapterIndex: state?.currentChapterIndex ?? null,
    error: state?.error ?? null,
    generationSettings: parsed.data,
    bookPlan: state?.bookPlan ?? null,
    streamingStatus: state?.streamingStatus ?? null,
  };
}

export async function createBookAction(
  title: string,
  tableOfContents: string[],
  sourceText: string,
  generationSettings: BookGenerationSettings,
) {
  const parsed = CreateBookInputSchema.parse({
    title,
    tableOfContents,
    sourceText,
    generationSettings,
  });

  const userId = await getUserId();

  const inserted = await db.transaction(async (tx) => {
    const result = await tx
      .insert(books)
      .values({
        userId,
        title: parsed.title,
        content: "",
        tableOfContents: parsed.tableOfContents,
        sourceText: parsed.sourceText || undefined,
      })
      .returning({ id: books.id });

    const row = result[0];
    if (!row) return null;

    await tx.insert(bookGenerationStates).values({
      bookId: row.id,
      status: "waiting",
      generationSettings: parsed.generationSettings,
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
  const parsed = SaveChapterInputSchema.parse({
    bookId,
    chapterNumber,
    title,
    content,
    outline,
  });

  const userId = await getUserId();

  const bookFound = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, parsed.bookId), eq(books.userId, userId)))
    .limit(1);

  if (bookFound.length === 0) {
    throw new Error("Book not found");
  }

  // 1. Save chapter
  await db
    .insert(chapters)
    .values({
      bookId: parsed.bookId,
      chapterNumber: parsed.chapterNumber,
      title: parsed.title,
      content: parsed.content,
      outline: parsed.outline,
      status: "completed",
    })
    .onConflictDoUpdate({
      target: [chapters.bookId, chapters.chapterNumber],
      set: {
        content: parsed.content,
        outline: parsed.outline,
        status: "completed",
      },
    });

  // 2. Update book content by aggregating all chapters
  const fullContent = await aggregateBookContent(parsed.bookId);

  await db.transaction(async (tx) => {
    await tx
      .insert(bookGenerationStates)
      .values({
        bookId: parsed.bookId,
        status: "generating",
        currentChapterIndex: parsed.chapterNumber,
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "generating",
          currentChapterIndex: parsed.chapterNumber,
        },
      });

    await tx
      .update(books)
      .set({
        content: fullContent,
      })
      .where(and(eq(books.id, parsed.bookId), eq(books.userId, userId)));
  });
}
