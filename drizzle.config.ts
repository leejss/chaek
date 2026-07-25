import { defineConfig } from "drizzle-kit";

import "./env.config";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL environment variable is not configured.");
}

if (!authToken) {
  throw new Error("TURSO_AUTH_TOKEN environment variable is not configured.");
}

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken,
  },
});
