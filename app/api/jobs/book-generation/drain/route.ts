import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, dbClient } from "@/db";
import { bookGenerationStates } from "@/db/schema";
import { bookGenerationJobSchema } from "@/lib/ai/jobs/bookGeneration";
import {
  archiveBookGenerationMessage,
  BOOK_GENERATION_MAX_READ_COUNT,
  deleteBookGenerationMessage,
  readBookGenerationJob,
} from "@/lib/ai/queue";
import { runBookGenerationJob } from "@/lib/ai/worker/bookGenerationWorker";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

async function acquireBookLock(bookId: string) {
  const rows = await dbClient.unsafe<{ locked: boolean }[]>(
    "select pg_try_advisory_lock(hashtextextended($1, 0)) as locked",
    [bookId],
  );

  return !!rows[0]?.locked;
}

async function releaseBookLock(bookId: string) {
  await dbClient.unsafe("select pg_advisory_unlock(hashtextextended($1, 0))", [bookId]);
}

async function markJobFailed(job: { bookId: string; generationVersion: number }, error: unknown) {
  await db
    .update(bookGenerationStates)
    .set({
      status: "failed",
      error: error instanceof Error ? error.message : "Worker error",
    })
    .where(
      and(
        eq(bookGenerationStates.bookId, job.bookId),
        eq(bookGenerationStates.generationVersion, job.generationVersion),
      ),
    );
}

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerToken = request.headers.get("x-job-secret");

  return (
    bearerToken === serverEnv.BOOK_GENERATION_JOB_SECRET ||
    headerToken === serverEnv.BOOK_GENERATION_JOB_SECRET
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const queuedMessage = await readBookGenerationJob();
  if (!queuedMessage) {
    return NextResponse.json({ ok: true, status: "empty" });
  }

  const parsed = bookGenerationJobSchema.safeParse(queuedMessage.message);
  if (!parsed.success) {
    console.error("[book-generation-drain] invalid payload:", parsed.error.flatten());
    await archiveBookGenerationMessage(queuedMessage.msgId);

    return NextResponse.json({
      ok: false,
      status: "archived_invalid_payload",
      msgId: queuedMessage.msgId,
    });
  }

  const job = parsed.data;
  const locked = await acquireBookLock(job.bookId);

  if (!locked) {
    return NextResponse.json(
      {
        ok: true,
        status: "locked",
        bookId: job.bookId,
        msgId: queuedMessage.msgId,
      },
      { status: 202 },
    );
  }

  try {
    const result = await runBookGenerationJob(job);
    await deleteBookGenerationMessage(queuedMessage.msgId);

    return NextResponse.json({
      ok: true,
      status: result.skipped ? "skipped" : "processed",
      msgId: queuedMessage.msgId,
      bookId: job.bookId,
    });
  } catch (error) {
    console.error("[book-generation-drain] worker error:", error);
    await markJobFailed(job, error);

    if (queuedMessage.readCt >= BOOK_GENERATION_MAX_READ_COUNT) {
      await archiveBookGenerationMessage(queuedMessage.msgId);

      return NextResponse.json(
        {
          ok: false,
          status: "archived_after_retries",
          msgId: queuedMessage.msgId,
          bookId: job.bookId,
          error: error instanceof Error ? error.message : "Worker error",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "retry_scheduled",
        msgId: queuedMessage.msgId,
        bookId: job.bookId,
        error: error instanceof Error ? error.message : "Worker error",
      },
      { status: 500 },
    );
  } finally {
    await releaseBookLock(job.bookId);
  }
}
