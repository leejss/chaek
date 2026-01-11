import { Receiver } from "@upstash/qstash";
import { NextResponse, type NextRequest } from "next/server";
import { generateBookJobSchema } from "@/lib/ai/jobs/types";
import { handleGenerateBookJob } from "@/lib/ai/worker/generateBookWorker";
import { db } from "@/db";
import { bookGenerationStates, books } from "@/db/schema";
import { eq } from "drizzle-orm";
import { refundUsageCredits } from "@/lib/credits/operations";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import { serverEnv } from "@/lib/env";

const receiver = new Receiver({
  currentSigningKey: serverEnv.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: serverEnv.QSTASH_NEXT_SIGNING_KEY,
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get("upstash-signature");
  const body = await req.text();

  console.log("[queues/book-generation] received request:", body);

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing signature" },
      { status: 401 },
    );
  }

  try {
    await receiver.verify({
      signature,
      body,
      url: req.url,
    });
  } catch (error) {
    console.error("[queues/book-generation] invalid signature:", error);
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = generateBookJobSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload" },
      { status: 400 },
    );
  }

  const job = parsed.data;
  const found = await db
    .select({
      userId: books.userId,
      stateStatus: bookGenerationStates.status,
    })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(eq(books.id, job.bookId))
    .limit(1);

  if (found.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const bookRow = found[0];
  if (!bookRow) {
    return NextResponse.json({ ok: true });
  }

  const status = bookRow.stateStatus ?? "waiting";

  if (status === "completed" || status === "failed") {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleGenerateBookJob(job);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await refundUsageCredits({
      userId: bookRow.userId,
      amount: BOOK_CREATION_COST,
      bookId: job.bookId,
      metadata: {
        reason: "async_book_generation_failed",
      },
    });

    await db
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        status: "failed",
        error: error instanceof Error ? error.message : "Worker error",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "failed",
          error: error instanceof Error ? error.message : "Worker error",
          updatedAt: new Date(),
        },
      });

    return NextResponse.json(
      { ok: false, error: "Worker error" },
      { status: 500 },
    );
  }
}
