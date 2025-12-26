import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";

import { serverEnv } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  client: SQL | undefined;
};

const client =
  globalForDb.client ??
  new SQL({
    url: serverEnv.DATABASE_URL,
    prepare: false,
    idleTimeout: 10,
  });

if (serverEnv.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle({ client });
