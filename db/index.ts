import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";

import { serverEnv } from "@/lib/env";

const url = serverEnv.DATABASE_URL;

const client = new SQL({
  url,
  prepare: false,
});

export const db = drizzle({ client });
