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

export const bookStatusEnum = pgEnum("book_status", [
  "waiting",
  "generating",
  "completed",
  "failed",
]);

export type BookStatus = (typeof bookStatusEnum.enumValues)[number];

export const chapterStatusEnum = pgEnum("chapter_status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);

export type ChapterStatus = (typeof chapterStatusEnum.enumValues)[number];

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
    content: text("content").notNull().default(""),
    tableOfContents: text("table_of_contents").array(),
    sourceText: text("source_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("books_user_id_idx").on(table.userId),
    index("books_updated_at_idx").on(table.updatedAt),
  ],
);

export const publishedBooks = pgTable(
  "published_books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    publisherUserId: uuid("publisher_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("published_books_book_id_uq").on(table.bookId),
    index("published_books_published_at_idx").on(table.publishedAt),
    index("published_books_publisher_user_id_idx").on(table.publisherUserId),
  ],
);

export const bookGenerationStates = pgTable(
  "book_generation_states",
  {
    bookId: uuid("book_id")
      .primaryKey()
      .references(() => books.id, { onDelete: "cascade" }),
    status: bookStatusEnum("status").notNull().default("waiting"),
    currentChapterIndex: integer("current_chapter_index"),
    error: text("error"),
    generationSettings: jsonb("generation_settings"),
    bookPlan: jsonb("book_plan"),
    streamingStatus: jsonb("streaming_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("book_generation_states_status_idx").on(table.status),
    index("book_generation_states_updated_at_idx").on(table.updatedAt),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    outline: jsonb("outline"),
    status: chapterStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("chapters_book_id_chapter_number_uq").on(
      table.bookId,
      table.chapterNumber,
    ),
    index("chapters_book_id_idx").on(table.bookId),
    index("chapters_status_idx").on(table.status),
  ],
);

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "purchase",
  "usage",
  "usage_refund",
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
    .defaultNow()
    .$onUpdate(() => new Date()),
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
