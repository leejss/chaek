import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { contentNodes } from "./content-nodes";
import { contentProjects } from "./content-projects";
import {
  CONTENT_BUILD_PHASES,
  CONTENT_BUILD_SCOPE_TYPES,
  CONTENT_BUILD_STATUSES,
} from "./types";
import { users } from "./users";

export const contentBuilds = sqliteTable(
  "content_builds",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => contentProjects.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    scopeType: text("scope_type", { enum: CONTENT_BUILD_SCOPE_TYPES })
      .notNull()
      .default("project"),
    scopeNodeId: text("scope_node_id").references(() => contentNodes.id, {
      onDelete: "set null",
    }),
    baseGraphVersion: integer("base_graph_version").notNull(),
    resultGraphVersion: integer("result_graph_version"),
    phase: text("phase", { enum: CONTENT_BUILD_PHASES })
      .notNull()
      .default("interpreting"),
    status: text("status", { enum: CONTENT_BUILD_STATUSES })
      .notNull()
      .default("queued"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_builds_project_idempotency_unique").on(
      table.projectId,
      table.idempotencyKey,
    ),
    index("content_builds_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("content_builds_status_updated_at_idx").on(
      table.status,
      table.updatedAt,
    ),
    check(
      "content_builds_base_graph_version_check",
      sql`${table.baseGraphVersion} >= 0`,
    ),
    check(
      "content_builds_result_graph_version_check",
      sql`${table.resultGraphVersion} is null or ${table.resultGraphVersion} >= 0`,
    ),
    check(
      "content_builds_scope_type_check",
      sql`${table.scopeType} in ('project', 'part', 'chapter', 'affected_subgraph')`,
    ),
    check(
      "content_builds_phase_check",
      sql`${table.phase} in ('interpreting', 'planning', 'validating', 'researching', 'drafting', 'reviewing', 'revising', 'finalizing')`,
    ),
    check(
      "content_builds_status_check",
      sql`${table.status} in ('queued', 'running', 'waiting_for_user', 'partially_completed', 'completed', 'failed', 'cancelled')`,
    ),
  ],
);

export type ContentBuild = typeof contentBuilds.$inferSelect;
export type NewContentBuild = typeof contentBuilds.$inferInsert;
