"use server";

import { db } from "@/db";
import { bookGenerationStates, books, creditTransactions } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { deductCredits, getUserBalance } from "@/lib/credits/operations";
import { and, eq } from "drizzle-orm";
import { BOOK_CREATION_COST } from "@/lib/credits/config";

export async function deductCreditsAction(bookId: string) {
  const userId = await getUserId();

  const existing = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Book not found");
  }

  const row = existing[0];
  const book = row?.book;
  const state = row?.state;
  if (!book) {
    throw new Error("Book not found");
  }

  if (state?.status === "completed") {
    throw new Error("Book already completed");
  }

  const existingUsage = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.type, "usage"),
        eq(creditTransactions.bookId, bookId),
      ),
    )
    .limit(1);

  if (existingUsage.length > 0) {
    return;
  }

  const balance = await getUserBalance(userId);
  if (balance.balance < BOOK_CREATION_COST) {
    throw new Error("Insufficient credits");
  }

  await deductCredits({
    userId,
    amount: BOOK_CREATION_COST,
    bookId,
    metadata: { reason: "sync_book_generation" },
  });
}
