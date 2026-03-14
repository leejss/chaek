import { and, asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookGenerationStates, books, chapters } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";

export const runtime = "nodejs";

function buildFullContent(
  chapterRows: Array<{ status: string; chapterNumber: number; content: string | null }>,
) {
  return chapterRows
    .filter((chapter) => chapter.status === "completed")
    .sort((left, right) => left.chapterNumber - right.chapterNumber)
    .map((chapter) => chapter.content ?? "")
    .join("\n\n");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);

    const { id: bookId } = await params;

    const found = await db
      .select({ book: books, state: bookGenerationStates })
      .from(books)
      .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (found.length === 0) throw new HttpError(404, "Book not found");

    const row = found[0];
    const book = row?.book;
    const state = row?.state;
    if (!book) throw new HttpError(404, "Book not found");

    const status = state?.status ?? "waiting";
    const error = state?.error ?? null;
    const currentChapterIndex = state?.currentChapterIndex ?? null;
    const currentSectionIndex = state?.currentSectionIndex ?? null;
    const generationVersion = state?.generationVersion ?? 1;

    const chapterRows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.chapterNumber));

    const totalChapters = Array.isArray(book.tableOfContents)
      ? book.tableOfContents.length
      : chapterRows.length;

    const completedChapters = chapterRows.filter((c) => c.status === "completed").length;
    // Product policy: if every chapter has been persisted, completion wins over any
    // stale in-progress or late cancel status so the UI can converge to completed.
    const shouldHealCompleted =
      totalChapters > 0 && completedChapters >= totalChapters && status !== "completed";

    let responseStatus = status;
    let responseError = error;
    let responseCurrentChapterIndex = currentChapterIndex;
    let responseCurrentSectionIndex = currentSectionIndex;

    if (shouldHealCompleted) {
      await db.transaction(async (tx) => {
        await tx
          .update(books)
          .set({
            content: buildFullContent(chapterRows),
          })
          .where(eq(books.id, bookId));

        await tx
          .insert(bookGenerationStates)
          .values({
            bookId,
            status: "completed",
            currentChapterIndex: totalChapters,
            currentSectionIndex: null,
            error: null,
          })
          .onConflictDoUpdate({
            target: [bookGenerationStates.bookId],
            set: {
              status: "completed",
              currentChapterIndex: totalChapters,
              currentSectionIndex: null,
              error: null,
            },
          });
      });

      responseStatus = "completed";
      responseError = null;
      responseCurrentChapterIndex = totalChapters;
      responseCurrentSectionIndex = null;
    }

    return NextResponse.json({
      ok: true,
      status: responseStatus,
      error: responseError,
      currentChapterIndex: responseCurrentChapterIndex,
      currentSectionIndex: responseCurrentSectionIndex,
      generationVersion,
      totalChapters,
      completedChapters,
      chapters: chapterRows.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        status: c.status,
        content: c.status === "completed" ? c.content?.substring(0, 200) : undefined,
      })),
    });
  } catch (error) {
    console.error("[books/[id]/status] error:", error);

    const httpError = error instanceof HttpError ? error : null;
    if (httpError) {
      return NextResponse.json(
        { ok: false, error: httpError.publicMessage },
        { status: httpError.status },
      );
    }

    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
