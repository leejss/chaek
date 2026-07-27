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
import type { JsonObject } from "./types";
import { CONTENT_EDGE_TYPES } from "./types";

export const contentEdges = sqliteTable(
  "content_edges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => contentProjects.id, { onDelete: "cascade" }),
    fromNodeId: text("from_node_id")
      .notNull()
      .references(() => contentNodes.id, { onDelete: "cascade" }),
    toNodeId: text("to_node_id")
      .notNull()
      .references(() => contentNodes.id, { onDelete: "cascade" }),
    type: text("type", { enum: CONTENT_EDGE_TYPES }).notNull(),
    metadataJson: text("metadata_json", { mode: "json" }).$type<JsonObject>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("content_edges_project_from_type_to_unique").on(
      table.projectId,
      table.fromNodeId,
      table.type,
      table.toNodeId,
    ),
    index("content_edges_project_from_type_idx").on(
      table.projectId,
      table.fromNodeId,
      table.type,
    ),
    index("content_edges_project_to_type_idx").on(
      table.projectId,
      table.toNodeId,
      table.type,
    ),
    check(
      "content_edges_type_check",
      sql`${table.type} in ('requires', 'introduces', 'uses', 'continues')`,
    ),
    check(
      "content_edges_no_self_edge_check",
      sql`${table.fromNodeId} <> ${table.toNodeId}`,
    ),
  ],
);

export type ContentEdge = typeof contentEdges.$inferSelect;
export type NewContentEdge = typeof contentEdges.$inferInsert;
