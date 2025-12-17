import { ConfigError } from "@/lib/errors";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Server log only: do not include the env name in the thrown error message.
    console.error(`[ConfigError] Missing required env: ${name}`);
    throw new ConfigError({ missingEnv: name });
  }
  return value;
}
