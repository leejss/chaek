import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  googleSub: text("google_sub").notNull().unique(),
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  () => ({
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    replacedByTokenId: uuid("replaced_by_token_id"),
  }),
  (table) => [
    foreignKey({
      columns: [table.replacedByTokenId],
      foreignColumns: [table.id],
      name: "refresh_tokens_replaced_by_token_id_fk",
    }).onDelete("set null"),
    index("user_id_idx").on(table.userId),
    uniqueIndex("refresh_tokens_token_hash_uq").on(table.tokenHash),
    index("refresh_tokens_expires_at_idx").on(table.expiresAt),
    index("refresh_tokens_replaced_by_token_id_idx").on(
      table.replacedByTokenId,
    ),
  ],
);

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tableOfContents: text("table_of_contents").array(),
    sourceText: text("source_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("books_user_id_idx").on(table.userId)],
);

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "purchase",
  "usage",
  "refund",
  "free_signup",
]);

export type CreditTransactionType =
  (typeof creditTransactionTypeEnum.enumValues)[number];

export const creditBalances = pgTable("credit_balances", {
  userId: uuid("user_id")
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  freeCredits: integer("free_credits").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: creditTransactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    lemonSqueezyOrderId: text("lemonsqueezy_order_id"),
    bookId: uuid("book_id").references(() => books.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("credit_transactions_user_id_idx").on(table.userId),
    index("credit_transactions_type_idx").on(table.type),
    index("credit_transactions_created_at_idx").on(table.createdAt),
    uniqueIndex("credit_transactions_purchase_order_uq").on(
      table.type,
      table.lemonSqueezyOrderId,
    ),
  ],
);
