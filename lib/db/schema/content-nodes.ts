import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { contentProjects } from "./content-projects";
import type { JsonObject } from "./types";
import {
  CONTENT_NODE_EDITORIAL_STATUSES,
  CONTENT_NODE_FRESHNESS_STATUSES,
  CONTENT_NODE_KINDS,
} from "./types";

export const contentNodes = sqliteTable(
  "content_nodes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => contentProjects.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => contentNodes.id,
      {
        onDelete: "cascade",
      },
    ),
    kind: text("kind", { enum: CONTENT_NODE_KINDS }).notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    position: integer("position"),
    contractJson: text("contract_json", { mode: "json" }).$type<JsonObject>(),
    editorialStatus: text("editorial_status", {
      enum: CONTENT_NODE_EDITORIAL_STATUSES,
    })
      .notNull()
      .default("planned"),
    freshness: text("freshness", {
      enum: CONTENT_NODE_FRESHNESS_STATUSES,
    })
      .notNull()
      .default("fresh"),
    staleReasonJson: text("stale_reason_json", {
      mode: "json",
    }).$type<JsonObject>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_nodes_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
    index("content_nodes_project_kind_idx").on(table.projectId, table.kind),
    index("content_nodes_project_parent_position_idx").on(
      table.projectId,
      table.parentId,
      table.position,
    ),
    index("content_nodes_project_editorial_freshness_idx").on(
      table.projectId,
      table.editorialStatus,
      table.freshness,
    ),
    check(
      "content_nodes_kind_check",
      sql`${table.kind} in ('part', 'chapter', 'concept', 'example')`,
    ),
    check(
      "content_nodes_editorial_status_check",
      sql`${table.editorialStatus} in ('planned', 'approved', 'drafting', 'review', 'ready', 'published')`,
    ),
    check(
      "content_nodes_freshness_check",
      sql`${table.freshness} in ('fresh', 'stale')`,
    ),
    check(
      "content_nodes_position_check",
      sql`${table.position} is null or ${table.position} >= 0`,
    ),
  ],
);

export type ContentNode = typeof contentNodes.$inferSelect;
export type NewContentNode = typeof contentNodes.$inferInsert;
