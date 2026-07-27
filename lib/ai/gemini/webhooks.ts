import "server-only";

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import type { GeminiWebhookEvent } from "@/lib/content/contracts";
import { getDb } from "@/lib/db";
import { aiJobs, type WebhookPayload, webhookEvents } from "@/lib/db/schema";

import { getGeminiClient } from "./client";
import { reconcileAiJob } from "./interactions";
import { verifyStandardGeminiWebhook } from "./webhook-verification";

function getWebhookSigningSecret() {
  const secret = process.env.GEMINI_WEBHOOK_SIGNING_SECRET;

  if (!secret) {
    throw new Error(
      "GEMINI_WEBHOOK_SIGNING_SECRET environment variable is not configured.",
    );
  }

  return secret;
}

export function verifyGeminiWebhook(rawBody: string, headers: Headers) {
  return verifyStandardGeminiWebhook(
    rawBody,
    headers,
    getWebhookSigningSecret(),
  );
}

export async function createStaticGeminiWebhook(uri: string) {
  const webhook = await getGeminiClient().webhooks.create({
    name: "chaek-content-compiler",
    subscribed_events: [
      "interaction.requires_action",
      "interaction.completed",
      "interaction.failed",
    ],
    uri,
  });

  return {
    id: webhook.id,
    name: webhook.name,
    uri: webhook.uri,
    signingSecret: webhook.new_signing_secret,
  };
}

export async function receiveGeminiWebhook(
  webhookId: string,
  event: GeminiWebhookEvent,
) {
  const [job] = await getDb()
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(eq(aiJobs.geminiInteractionId, event.data.id))
    .limit(1);

  const inserted = await getDb()
    .insert(webhookEvents)
    .values({
      id: webhookId,
      eventType: event.type,
      eventVersion: event.version,
      geminiInteractionId: event.data.id,
      aiJobId: job?.id,
      payloadJson: event as unknown as WebhookPayload,
      status: "received",
      occurredAt: new Date(event.timestamp),
    })
    .onConflictDoNothing({ target: webhookEvents.id })
    .returning({ id: webhookEvents.id });

  return {
    inserted: inserted.length > 0,
    eventId: webhookId,
  };
}

function getNextAttemptAt(attemptCount: number) {
  const delaySeconds = Math.min(5 * 2 ** Math.max(attemptCount - 1, 0), 300);
  return new Date(Date.now() + delaySeconds * 1_000);
}

export async function processWebhookEvent(eventId: string) {
  const now = new Date();
  const [event] = await getDb()
    .update(webhookEvents)
    .set({
      status: "processing",
      attemptCount: sql`${webhookEvents.attemptCount} + 1`,
      nextAttemptAt: null,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(webhookEvents.id, eventId),
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
      ),
    )
    .returning();

  if (!event) {
    return;
  }

  try {
    let jobId = event.aiJobId;

    if (!jobId) {
      const [job] = await getDb()
        .select({ id: aiJobs.id })
        .from(aiJobs)
        .where(eq(aiJobs.geminiInteractionId, event.geminiInteractionId))
        .limit(1);

      jobId = job?.id ?? null;
    }

    if (!jobId) {
      throw new Error("No AI job mapping exists for this interaction.");
    }

    await getDb()
      .update(webhookEvents)
      .set({ aiJobId: jobId, updatedAt: new Date() })
      .where(eq(webhookEvents.id, event.id));

    await reconcileAiJob(jobId);

    await getDb()
      .update(webhookEvents)
      .set({
        status: "processed",
        processedAt: new Date(),
        updatedAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
      })
      .where(eq(webhookEvents.id, event.id));
  } catch (error) {
    await getDb()
      .update(webhookEvents)
      .set({
        status: "failed",
        nextAttemptAt: getNextAttemptAt(event.attemptCount + 1),
        lastError:
          error instanceof Error ? error.message.slice(0, 2_000) : "Unknown",
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.id, event.id));
  }
}
