import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Sql } from "postgres";

import { serverEnv } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  client: Sql | undefined;
};

const client =
  globalForDb.client ??
  postgres(serverEnv.DATABASE_URL, {
    max: 1,
    idle_timeout: 10,
  });

if (serverEnv.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client);
