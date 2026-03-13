import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import { databaseEnv } from '@/lib/env';

const globalForDb = globalThis as unknown as {
  client: Sql | undefined;
};

const client =
  globalForDb.client ??
  postgres(databaseEnv.DATABASE_URL, {
    max: 1,
    idle_timeout: 10
  });

if (databaseEnv.NODE_ENV !== 'production') globalForDb.client = client;

export const db = drizzle(client);
export const dbClient = client;
