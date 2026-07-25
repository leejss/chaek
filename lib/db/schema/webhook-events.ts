import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { aiJobs } from "./ai-jobs";
import type { WebhookPayload } from "./types";
import { WEBHOOK_EVENT_STATUSES, WEBHOOK_EVENT_TYPES } from "./types";

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type", { enum: WEBHOOK_EVENT_TYPES }).notNull(),
    eventVersion: text("event_version"),
    geminiInteractionId: text("gemini_interaction_id").notNull(),
    aiJobId: text("ai_job_id").references(() => aiJobs.id, {
      onDelete: "set null",
    }),
    payloadJson: text("payload_json", { mode: "json" })
      .$type<WebhookPayload>()
      .notNull(),
    status: text("status", { enum: WEBHOOK_EVENT_STATUSES })
      .notNull()
      .default("received"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("webhook_events_gemini_interaction_idx").on(
      table.geminiInteractionId,
    ),
    index("webhook_events_ai_job_idx").on(table.aiJobId),
    index("webhook_events_status_next_attempt_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
    check(
      "webhook_events_status_check",
      sql`${table.status} in ('received', 'processing', 'processed', 'failed')`,
    ),
    check(
      "webhook_events_event_type_check",
      sql`${table.eventType} in ('interaction.requires_action', 'interaction.completed', 'interaction.failed', 'interaction.cancelled')`,
    ),
    check(
      "webhook_events_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
