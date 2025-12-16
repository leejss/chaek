import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";

const url = process.env.DATABASE_URL!;
if (!url) {
  throw new Error("DATABASE_URL is not defined");
}

const client = new SQL({
  url,
  prepare: false,
});

export const db = drizzle({ client });
