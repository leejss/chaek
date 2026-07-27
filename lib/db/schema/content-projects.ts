import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { ContentBriefResult } from "@/lib/content/contracts";

import { CONTENT_PROJECT_STATUSES } from "./types";
import { users } from "./users";

export const contentProjects = sqliteTable(
  "content_projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creationIdempotencyKey: text("creation_idempotency_key").notNull(),
    title: text("title").notNull(),
    seedInput: text("seed_input").notNull(),
    briefJson: text("brief_json", { mode: "json" }).$type<ContentBriefResult>(),
    status: text("status", { enum: CONTENT_PROJECT_STATUSES })
      .notNull()
      .default("planning"),
    graphVersion: integer("graph_version").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_projects_user_creation_key_unique").on(
      table.userId,
      table.creationIdempotencyKey,
    ),
    index("content_projects_user_updated_at_idx").on(
      table.userId,
      table.updatedAt,
    ),
    index("content_projects_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    check(
      "content_projects_graph_version_check",
      sql`${table.graphVersion} >= 0`,
    ),
    check(
      "content_projects_status_check",
      sql`${table.status} in ('planning', 'drafting', 'review', 'ready', 'published')`,
    ),
  ],
);

export type ContentProject = typeof contentProjects.$inferSelect;
export type NewContentProject = typeof contentProjects.$inferInsert;
