import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authenticate(req);

    const { id: bookId } = await params;

    const found = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (found.length === 0) throw new HttpError(404, "Book not found");

    const book = found[0];

    const chapterRows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.chapterNumber));

    const totalChapters = Array.isArray(book.tableOfContents)
      ? book.tableOfContents.length
      : chapterRows.length;

    const completedChapters = chapterRows.filter((c) => c.status === "completed").length;

    return NextResponse.json({
      ok: true,
      status: book.status,
      error: book.error,
      currentChapterIndex: book.currentChapterIndex,
      totalChapters,
      completedChapters,
      chapters: chapterRows.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        status: c.status,
        content: c.status === "completed" ? c.content : undefined,
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

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

