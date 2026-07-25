import "server-only";

import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

function createDatabase() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL environment variable is not configured.",
    );
  }

  if (!authToken) {
    throw new Error("TURSO_AUTH_TOKEN environment variable is not configured.");
  }

  return drizzle({
    connection: {
      url,
      authToken,
    },
    schema,
  });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDb() {
  database ??= createDatabase();

  return database;
}

export type Database = ReturnType<typeof createDatabase>;
