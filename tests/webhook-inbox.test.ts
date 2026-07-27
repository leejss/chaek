import assert from "node:assert/strict";
import test from "node:test";

import { createClient } from "@libsql/client";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import { webhookEvents } from "../lib/db/schema/webhook-events";

async function createWebhookInboxTestDb() {
  const client = createClient({ url: "file::memory:" });

  await client.executeMultiple(`
    CREATE TABLE ai_jobs (
      id TEXT PRIMARY KEY NOT NULL
    );

    CREATE TABLE webhook_events (
      id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      event_version TEXT,
      gemini_interaction_id TEXT NOT NULL,
      ai_job_id TEXT,
      payload_json TEXT NOT NULL,
      status TEXT DEFAULT 'received' NOT NULL,
      attempt_count INTEGER DEFAULT 0 NOT NULL,
      next_attempt_at INTEGER,
      last_error TEXT,
      occurred_at INTEGER,
      received_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      processed_at INTEGER,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (ai_job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL
    );
  `);

  return {
    client,
    db: drizzle(client),
  };
}

function createEvent(id: string) {
  return {
    id,
    eventType: "interaction.completed" as const,
    geminiInteractionId: "interaction-1",
    payloadJson: {
      type: "interaction.completed",
      timestamp: new Date().toISOString(),
      data: { id: "interaction-1" },
    },
  };
}

test("the webhook-id primary key makes repeated delivery idempotent", async () => {
  const { client, db } = await createWebhookInboxTestDb();

  try {
    const first = await db
      .insert(webhookEvents)
      .values(createEvent("webhook-1"))
      .onConflictDoNothing({ target: webhookEvents.id })
      .returning({ id: webhookEvents.id });
    const duplicate = await db
      .insert(webhookEvents)
      .values(createEvent("webhook-1"))
      .onConflictDoNothing({ target: webhookEvents.id })
      .returning({ id: webhookEvents.id });

    assert.equal(first.length, 1);
    assert.equal(duplicate.length, 0);
  } finally {
    client.close();
  }
});

test("concurrent inbox processors can claim an event only once", async () => {
  const { client, db } = await createWebhookInboxTestDb();

  try {
    await db.insert(webhookEvents).values(createEvent("webhook-claim"));

    const claim = () =>
      db
        .update(webhookEvents)
        .set({
          status: "processing" as const,
          attemptCount: sql`${webhookEvents.attemptCount} + 1`,
        })
        .where(
          and(
            eq(webhookEvents.id, "webhook-claim"),
            eq(webhookEvents.status, "received"),
          ),
        )
        .returning({ id: webhookEvents.id });

    const claims = await Promise.all([claim(), claim()]);

    assert.equal(claims.flat().length, 1);
  } finally {
    client.close();
  }
});
