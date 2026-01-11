import { db } from "@/db";
import { books } from "@/db/schema";
import { ValidationError } from "@/lib/errors";
import { BookGenerationSettingsSchema } from "@/lib/ai/schemas/settings";
import { and, eq } from "drizzle-orm";

export async function findBookByIdAndUserId(bookId: string, userId: string) {
  const result = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  const book = result[0];

  if (book) {
    const parsed = BookGenerationSettingsSchema.safeParse(
      book.generationSettings,
    );

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      throw new ValidationError(
        `Invalid generationSettings for book ${bookId}`,
        fieldErrors,
      );
    }

    return {
      ...book,
      generationSettings: parsed.data,
    };
  }

  return book;
}
