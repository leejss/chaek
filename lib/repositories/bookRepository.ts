import { db } from "@/db";
import { bookGenerationStates, books, chapters } from "@/db/schema";
import { ValidationError } from "@/lib/errors";
import { BookGenerationSettingsSchema } from "@/lib/ai/schemas/settings";
import { and, eq, asc } from "drizzle-orm";

export async function aggregateBookContent(bookId: string) {
  const result = await db
    .select({ content: chapters.content })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.chapterNumber));

  return result.map((c) => c.content).join("\n\n");
}

export async function findBookByIdAndUserId(bookId: string, userId: string) {
  const result = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  const row = result[0];
  const book = row?.book;
  const state = row?.state;

  if (book) {
    const defaultGenerationSettings = {
      provider: "google",
      model: "gemini-3-flash-preview",
      language: "Korean",
      chapterCount: "Auto",
      userPreference: "",
    };

    const merged = {
      ...book,
      status: state?.status ?? "waiting",
      currentChapterIndex: state?.currentChapterIndex ?? null,
      error: state?.error ?? null,
      generationSettings:
        state?.generationSettings ?? defaultGenerationSettings,
      bookPlan: state?.bookPlan ?? null,
      streamingStatus: state?.streamingStatus ?? null,
    };

    const parsed = BookGenerationSettingsSchema.safeParse(
      merged.generationSettings,
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
      ...merged,
      generationSettings: parsed.data,
    };
  }

  return book;
}
