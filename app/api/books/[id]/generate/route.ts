import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookGenerationStates, books } from "@/db/schema";
import { bookGenerationJobSchema } from "@/lib/ai/jobs/bookGeneration";
import { BookGenerationSettingsSchema } from "@/lib/ai/schemas/settings";
import { enqueueBookGenerationJob } from "@/lib/ai/sqs";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { normalizeToHttpError } from "@/utils";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(_req);
    const userId = auth.userId;
    const bookId = (await params).id;

    const found = await db
      .select({ book: books, state: bookGenerationStates })
      .from(books)
      .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    const row = found[0];
    if (!row?.book) {
      throw new HttpError(404, "Book not found");
    }

    const state = row.state;
    if (!state) {
      throw new HttpError(409, "Book generation state not found");
    }

    if (state.status === "completed") {
      throw new HttpError(409, "Book already completed");
    }
    if (state.status === "generating") {
      return NextResponse.json({ ok: true, status: "already_generating" }, { status: 202 });
    }

    if (!row.book.sourceText?.trim() || !row.book.tableOfContents?.length) {
      throw new HttpError(400, "Book source text or table of contents is missing");
    }

    const parsedSettings = BookGenerationSettingsSchema.safeParse(state.generationSettings);
    if (!parsedSettings.success) {
      throw new HttpError(500, "Invalid generation settings");
    }

    const [updatedState] = await db
      .update(bookGenerationStates)
      .set({
        status: "waiting",
        generationVersion: sql`${bookGenerationStates.generationVersion} + 1`,
        currentChapterIndex: null,
        currentSectionIndex: null,
        error: null,
        generationSettings: parsedSettings.data,
        attemptCount: 0,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(bookGenerationStates.bookId, bookId))
      .returning({ generationVersion: bookGenerationStates.generationVersion });

    if (!updatedState) {
      throw new HttpError(409, "Book generation state not found");
    }

    const generationVersion = updatedState.generationVersion;

    const job = bookGenerationJobSchema.parse({
      bookId,
      generationVersion,
      trigger: "start",
    });

    await enqueueBookGenerationJob(job);

    return NextResponse.json(
      {
        ok: true,
        status: "queued",
        generationVersion,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[books/[id]/generate] error:", error);
    const httpError = normalizeToHttpError(error);
    if (httpError) {
      return NextResponse.json(
        { ok: false, error: httpError.publicMessage },
        { status: httpError.status },
      );
    }

    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
