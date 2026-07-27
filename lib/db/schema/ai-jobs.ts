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
import { contentBuilds } from "./content-builds";
import { contentNodes } from "./content-nodes";
import { contentProjects } from "./content-projects";
import type { AiJobInput, AiJobResult, AiJobUsage } from "./types";
import {
  AI_JOB_ERROR_STAGES,
  AI_JOB_RESULT_DISPOSITIONS,
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
    contentProjectId: text("content_project_id").references(
      () => contentProjects.id,
      {
        onDelete: "set null",
      },
    ),
    contentBuildId: text("content_build_id").references(
      () => contentBuilds.id,
      {
        onDelete: "set null",
      },
    ),
    targetNodeId: text("target_node_id").references(() => contentNodes.id, {
      onDelete: "set null",
    }),
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
    baseGraphVersion: integer("base_graph_version"),
    baseRevisionId: text("base_revision_id"),
    attemptNumber: integer("attempt_number").notNull().default(1),
    resultDisposition: text("result_disposition", {
      enum: AI_JOB_RESULT_DISPOSITIONS,
    }),
    appliedAt: integer("applied_at", { mode: "timestamp_ms" }),
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
    index("ai_jobs_content_project_idx").on(table.contentProjectId),
    index("ai_jobs_content_build_idx").on(table.contentBuildId),
    index("ai_jobs_target_node_idx").on(table.targetNodeId),
    check("ai_jobs_payload_version_check", sql`${table.payloadVersion} >= 1`),
    check("ai_jobs_attempt_number_check", sql`${table.attemptNumber} >= 1`),
    check(
      "ai_jobs_base_graph_version_check",
      sql`${table.baseGraphVersion} is null or ${table.baseGraphVersion} >= 0`,
    ),
    check(
      "ai_jobs_status_check",
      sql`${table.status} in ('queued', 'processing', 'requires_action', 'completed', 'failed', 'cancelled', 'incomplete')`,
    ),
    check(
      "ai_jobs_error_stage_check",
      sql`${table.errorStage} is null or ${table.errorStage} in ('submission', 'execution', 'result_fetch', 'webhook', 'internal')`,
    ),
    check(
      "ai_jobs_result_disposition_check",
      sql`${table.resultDisposition} is null or ${table.resultDisposition} in ('pending', 'applied', 'rejected', 'conflicted')`,
    ),
  ],
);

export type AiJob = typeof aiJobs.$inferSelect;
export type NewAiJob = typeof aiJobs.$inferInsert;
