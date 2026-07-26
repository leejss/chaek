import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const oauthStates = sqliteTable(
  "oauth_states",
  {
    stateHash: text("state_hash").primaryKey(),
    codeVerifier: text("code_verifier").notNull(),
    nonce: text("nonce").notNull(),
    returnTo: text("return_to").notNull().default("/"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("oauth_states_expires_at_idx").on(table.expiresAt)],
);

export type OauthState = typeof oauthStates.$inferSelect;
export type NewOauthState = typeof oauthStates.$inferInsert;
