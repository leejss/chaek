import { dbClient } from "@/db";
import type { BookGenerationJob } from "@/lib/ai/jobs/bookGeneration";
import { serverEnv } from "@/lib/env";

export const BOOK_GENERATION_QUEUE_NAME = "book_generation";
export const BOOK_GENERATION_VISIBILITY_TIMEOUT_SECONDS = 600;
export const BOOK_GENERATION_MAX_READ_COUNT = 3;

type QueueSendRow = {
  msg_id: number | string;
};

type QueueReadRow = {
  msg_id: number | string;
  read_ct: number | string;
  enqueued_at: Date | string;
  vt: Date | string;
  message: BookGenerationJob | string;
};

export type BookGenerationQueueMessage = {
  msgId: number;
  readCt: number;
  enqueuedAt: Date;
  vt: Date;
  message: BookGenerationJob;
};

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function parseMessage(value: BookGenerationJob | string): BookGenerationJob {
  return typeof value === "string" ? (JSON.parse(value) as BookGenerationJob) : value;
}

// Enqueue a new book generation job to the queue
export async function enqueueBookGenerationJob(job: BookGenerationJob) {
  const rows = await dbClient.unsafe<QueueSendRow[]>(
    "select * from pgmq.send($1, $2::jsonb)",
    [BOOK_GENERATION_QUEUE_NAME, JSON.stringify(job)],
  );

  return {
    msgId: toNumber(rows[0]?.msg_id ?? 0),
  };
}

export async function readBookGenerationJob(): Promise<BookGenerationQueueMessage | null> {
  const rows = await dbClient.unsafe<QueueReadRow[]>(
    "select msg_id, read_ct, enqueued_at, vt, message from pgmq.read($1, $2, $3)",
    [BOOK_GENERATION_QUEUE_NAME, BOOK_GENERATION_VISIBILITY_TIMEOUT_SECONDS, 1],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    msgId: toNumber(row.msg_id),
    readCt: toNumber(row.read_ct),
    enqueuedAt: toDate(row.enqueued_at),
    vt: toDate(row.vt),
    message: parseMessage(row.message),
  };
}

export async function deleteBookGenerationMessage(msgId: number) {
  await dbClient.unsafe("select * from pgmq.delete($1::text, $2::bigint)", [
    BOOK_GENERATION_QUEUE_NAME,
    msgId,
  ]);
}

export async function archiveBookGenerationMessage(msgId: number) {
  await dbClient.unsafe("select * from pgmq.archive($1::text, $2::bigint)", [
    BOOK_GENERATION_QUEUE_NAME,
    msgId,
  ]);
}

// Middle dispatcher layer
export async function triggerBookGenerationDispatcher() {
  const baseUrl =
    serverEnv.NODE_ENV === "production"
      ? serverEnv.APP_URL
      : `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/api/jobs/book-generation/drain`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.BOOK_GENERATION_JOB_SECRET}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn("[book-generation-drain-trigger] unexpected response:", response.status, body);
    }
  } catch (error) {
    console.warn("[book-generation-drain-trigger] trigger failed:", error);
  } finally {
    clearTimeout(timeoutId);
  }
}
