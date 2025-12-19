import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";

import { env } from "@/lib/env";

const url = env.DATABASE_URL;

const client = new SQL({
  url,
  prepare: false,
});

export const db = drizzle({ client });
