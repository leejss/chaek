import { db } from "@/db";
import { books } from "@/db/schema";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import { refundUsageCredits } from "@/lib/credits/operations";
import { HttpError } from "@/lib/errors";
import { eq } from "drizzle-orm";

export function normalizeToc(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
}

export async function handleGenerationError(params: {
  error: unknown;
  didDeductCredits: boolean;
  createdNewBook: boolean;
  userId: string;
  bookId: string;
}): Promise<{ message: string }> {
  const { error, didDeductCredits, createdNewBook, userId, bookId } = params;

  if (didDeductCredits) {
    try {
      await refundUsageCredits({
        userId,
        amount: BOOK_CREATION_COST,
        bookId,
        metadata: { reason: "streaming_generation_failed" },
      });
    } catch (refundError) {
      console.error("[handleGenerationError] refund failed:", refundError);
    }
  }

  if (createdNewBook) {
    await db.delete(books).where(eq(books.id, bookId));
  }

  const httpError = error instanceof HttpError ? error : null;
  return {
    message:
      httpError?.publicMessage ??
      (error instanceof Error ? error.message : "Unknown error"),
  };
}
