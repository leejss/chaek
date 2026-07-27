import "server-only";

import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { aiJobs, webhookEvents } from "@/lib/db/schema";

import { reconcileAiJob } from "./interactions";
import { processWebhookEvent } from "./webhooks";

const DEFAULT_STALE_AFTER_MS = 120_000;
const DEFAULT_BATCH_SIZE = 25;

export async function reconcileStaleAiWork(options?: {
  staleAfterMs?: number;
  limit?: number;
}) {
  const staleAfterMs = options?.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const limit = Math.min(options?.limit ?? DEFAULT_BATCH_SIZE, 100);
  const now = new Date();
  const staleBefore = new Date(now.getTime() - staleAfterMs);
  const db = getDb();

  const pendingEvents = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(
      or(
        eq(webhookEvents.status, "received"),
        and(
          eq(webhookEvents.status, "failed"),
          or(
            isNull(webhookEvents.nextAttemptAt),
            lte(webhookEvents.nextAttemptAt, now),
          ),
        ),
      ),
    )
    .limit(limit);

  for (const event of pendingEvents) {
    await processWebhookEvent(event.id);
  }

  const staleJobs = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(
      and(
        inArray(aiJobs.status, ["queued", "processing", "requires_action"]),
        isNull(aiJobs.resultDisposition),
        lte(aiJobs.updatedAt, staleBefore),
        or(
          isNull(aiJobs.lastReconciledAt),
          lte(aiJobs.lastReconciledAt, staleBefore),
        ),
      ),
    )
    .limit(limit);

  let reconciledJobs = 0;

  for (const job of staleJobs) {
    try {
      await reconcileAiJob(job.id);
      reconciledJobs += 1;
    } catch {
      // The job keeps its nonterminal state and result-fetch error for retry.
    }
  }

  return {
    processedEvents: pendingEvents.length,
    reconciledJobs,
  };
}
