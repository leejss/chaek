import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookGenerationStates, books } from "@/db/schema";
import { HttpError } from "@/lib/errors";

export function normalizeToc(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string" && t.length > 0);
}

export async function handleGenerationError(params: {
  error: unknown;
  createdNewBook: boolean;
  bookId: string;
}): Promise<{ message: string }> {
  const { error, createdNewBook, bookId } = params;

  if (createdNewBook) {
    await db.delete(books).where(eq(books.id, bookId));
  }

  const httpError = error instanceof HttpError ? error : null;

  if (!createdNewBook) {
    const shouldMarkFailed = !httpError || httpError.status >= 500;
    if (shouldMarkFailed) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await db.update(books).set({ updatedAt: new Date() }).where(eq(books.id, bookId));

      await db
        .insert(bookGenerationStates)
        .values({
          bookId,
          status: "failed",
          error: errorMessage,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [bookGenerationStates.bookId],
          set: {
            status: "failed",
            error: errorMessage,
            updatedAt: new Date(),
          },
        });
    }
  }

  return {
    message: httpError?.publicMessage ?? (error instanceof Error ? error.message : "Unknown error"),
  };
}
