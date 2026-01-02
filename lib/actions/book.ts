"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { books } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { BookSettings } from "@/lib/book/settings";

export async function createBookAction(
  title: string,
  tableOfContents: string[],
  sourceText?: string,
  generationSettings?: BookSettings,
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
      status: "draft",
      generationSettings: generationSettings ?? undefined,
    })
    .returning({ id: books.id });

  redirect(`/book/new/${result[0].id}`);
}

export async function updateBookAction(
  bookId: string,
  data: {
    content?: string;
    status?: "draft" | "generating" | "completed" | "failed";
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
