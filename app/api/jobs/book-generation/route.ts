import { Receiver } from "@upstash/qstash";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookGenerationStates } from "@/db/schema";
import { bookGenerationJobSchema } from "@/lib/ai/jobs/bookGeneration";
import { runBookGenerationJob } from "@/lib/ai/worker/bookGenerationWorker";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

const receiver = new Receiver({
  currentSigningKey: serverEnv.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: serverEnv.QSTASH_NEXT_SIGNING_KEY,
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get("upstash-signature");
  const body = await req.text();

  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 401 });
  }

  try {
    await receiver.verify({
      signature,
      body,
      url: req.url,
    });
  } catch (error) {
    console.error("[jobs/book-generation] invalid signature:", error);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bookGenerationJobSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const job = parsed.data;

  try {
    await runBookGenerationJob(job);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[jobs/book-generation] worker error:", error);

    await db
      .update(bookGenerationStates)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Worker error",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookGenerationStates.bookId, job.bookId),
          eq(bookGenerationStates.generationVersion, job.generationVersion),
        ),
      );

    return NextResponse.json({ ok: false, error: "Worker error" }, { status: 500 });
  }
}
