import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  OUR_JWT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
});

type Env = z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;

const fullSchema = serverSchema.extend(clientSchema.shape);

const isServer = typeof window === "undefined";

/**
 * 서버 환경변수와 클라이언트 환경변수를 통합하여 검증합니다.
 * 클라이언트 측에서는 NEXT_PUBLIC_ 접두사가 붙은 변수만 접근 가능합니다.
 */
function getEnv(): Env {
  if (isServer) {
    const _env = fullSchema.safeParse(process.env);
    if (!_env.success) {
      console.error(
        "❌ Invalid server environment variables:",
        JSON.stringify(_env.error.format(), null, 2),
      );
      throw new Error("Invalid environment variables");
    }
    return _env.data;
  } else {
    const _env = clientSchema.safeParse({
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    if (!_env.success) {
      console.error(
        "❌ Invalid client environment variables:",
        JSON.stringify(_env.error.format(), null, 2),
      );
      throw new Error("Invalid environment variables");
    }
    // 클라이언트에서는 서버 환경변수가 노출되지 않지만, 타입 일관성을 위해 캐스팅합니다.
    return _env.data as Env;
  }
}

export const env = getEnv();

/**
 * @deprecated Use the type-safe `env` object instead.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[ConfigError] Missing required env: ${name}`);
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}
