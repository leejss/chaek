import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

function loadEnvFile(filename: string) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  dotenv.config({ path: filePath });
}

loadEnvFile(".env");
loadEnvFile(".env.local");

try {
  const { serverEnv, clientEnv } = await import("../lib/env");
  void serverEnv;
  void clientEnv;
  console.log("✅ Environment variables validated");
} catch {
  console.error("❌ Environment variables validation failed");
  process.exitCode = 1;
}
