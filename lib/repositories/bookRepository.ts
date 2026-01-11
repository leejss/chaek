import { db } from "@/db";
import { books } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function findBookByIdAndUserId(bookId: string, userId: string) {
  const result = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  return result[0] ?? null;
}
