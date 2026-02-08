import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookGenerationStates, books, creditTransactions } from "@/db/schema";
import { bookGenerationJobSchema } from "@/lib/ai/jobs/bookGeneration";
import { BookGenerationSettingsSchema } from "@/lib/ai/schemas/settings";
import { enqueueBookGenerationJob } from "@/lib/ai/sqs";
import { authenticate } from "@/lib/auth";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import { deductCredits, getUserBalance, refundUsageCredits } from "@/lib/credits/operations";
import { HttpError } from "@/lib/errors";
import { normalizeToHttpError } from "@/utils";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId = "";
  let bookId = "";
  let didDeductCredits = false;

  try {
    const auth = await authenticate(_req);
    userId = auth.userId;
    bookId = (await params).id;

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

    const existingUsage = await db
      .select({ id: creditTransactions.id })
      .from(creditTransactions)
      .where(and(eq(creditTransactions.type, "usage"), eq(creditTransactions.bookId, bookId)))
      .limit(1);

    if (existingUsage.length === 0) {
      const balance = await getUserBalance(userId);
      if (balance.balance < BOOK_CREATION_COST) {
        throw new HttpError(402, "Insufficient credits");
      }

      await deductCredits({
        userId,
        amount: BOOK_CREATION_COST,
        bookId,
        metadata: {
          reason: "sqs_book_generation",
        },
      });
      didDeductCredits = true;
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
    if (didDeductCredits) {
      try {
        await refundUsageCredits({
          userId,
          amount: BOOK_CREATION_COST,
          bookId,
          metadata: {
            reason: "enqueue_failed",
          },
        });
      } catch (refundError) {
        console.error("[books/[id]/generate] refund failed:", refundError);
      }
    }

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
