import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { GEMINI_MODEL } from "../../ai/gemini/config";
import type { AiJobInput, AiJobResult, AiJobUsage } from "./types";
import {
  AI_JOB_ERROR_STAGES,
  AI_JOB_STATUSES,
  AI_JOB_TASK_TYPES,
} from "./types";
import { users } from "./users";

export const aiJobs = sqliteTable(
  "ai_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    taskType: text("task_type", { enum: AI_JOB_TASK_TYPES })
      .notNull()
      .default("content_generation"),
    payloadVersion: integer("payload_version").notNull().default(1),
    status: text("status", { enum: AI_JOB_STATUSES })
      .notNull()
      .default("queued"),
    model: text("model").notNull().default(GEMINI_MODEL),
    geminiInteractionId: text("gemini_interaction_id"),
    inputJson: text("input_json", { mode: "json" })
      .$type<AiJobInput>()
      .notNull(),
    resultJson: text("result_json", { mode: "json" }).$type<AiJobResult>(),
    usageJson: text("usage_json", { mode: "json" }).$type<AiJobUsage>(),
    errorStage: text("error_stage", { enum: AI_JOB_ERROR_STAGES }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    lastReconciledAt: integer("last_reconciled_at", {
      mode: "timestamp_ms",
    }),
  },
  (table) => [
    uniqueIndex("ai_jobs_user_idempotency_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
    uniqueIndex("ai_jobs_gemini_interaction_unique").on(
      table.geminiInteractionId,
    ),
    index("ai_jobs_user_created_at_idx").on(table.userId, table.createdAt),
    index("ai_jobs_status_updated_at_idx").on(table.status, table.updatedAt),
    check("ai_jobs_payload_version_check", sql`${table.payloadVersion} >= 1`),
    check(
      "ai_jobs_status_check",
      sql`${table.status} in ('queued', 'processing', 'requires_action', 'completed', 'failed', 'cancelled', 'incomplete')`,
    ),
    check(
      "ai_jobs_error_stage_check",
      sql`${table.errorStage} is null or ${table.errorStage} in ('submission', 'execution', 'result_fetch', 'webhook', 'internal')`,
    ),
  ],
);

export type AiJob = typeof aiJobs.$inferSelect;
export type NewAiJob = typeof aiJobs.$inferInsert;
