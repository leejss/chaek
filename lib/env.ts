import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_DIRECT_URL: z.string().min(1, "DATABASE_DIRECT_URL is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  OUR_JWT_SECRET: z.string().min(1, "OUR_JWT_SECRET is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  QSTASH_TOKEN: z.string().min(1, "QSTASH_TOKEN is required"),
  QSTASH_CURRENT_SIGNING_KEY: z
    .string()
    .min(1, "QSTASH_CURRENT_SIGNING_KEY is required"),
  QSTASH_NEXT_SIGNING_KEY: z
    .string()
    .min(1, "QSTASH_NEXT_SIGNING_KEY is required"),
  QSTASH_BASE_URL: z.string().url("QSTASH_BASE_URL must be a valid URL"),
  LEMONSQUEEZY_API_KEY: z.string().min(1, "LEMONSQUEEZY_API_KEY is required"),
  LEMONSQUEEZY_WEBHOOK_SECRET: z
    .string()
    .min(1, "LEMONSQUEEZY_WEBHOOK_SECRET is required"),
  LEMONSQUEEZY_STORE_ID: z.string().min(1, "LEMONSQUEEZY_STORE_ID is required"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

const isServer = () => typeof window === "undefined";

const validateServerEnv = (): ServerEnv => {
  if (!isServer()) {
    throw new Error(
      "❌ [Runtime Error] 'serverEnv'는 서버 런타임에서만 접근 가능합니다.",
    );
  }

  const fullSchema = serverSchema.extend(clientSchema.shape);
  const _env = fullSchema.safeParse(process.env);

  if (!_env.success) {
    console.error(
      "❌ Invalid server environment variables:",
      JSON.stringify(_env.error.format(), null, 2),
    );
    throw new Error("Invalid server environment variables");
  }

  return _env.data;
};

function validateClientEnv(): ClientEnv {
  const _env = clientSchema.safeParse({
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });

  if (!_env.success) {
    console.error(
      "❌ Invalid client environment variables:",
      JSON.stringify(_env.error.format(), null, 2),
    );
    throw new Error("Invalid client environment variables");
  }

  return _env.data;
}

export const serverEnv = isServer() ? validateServerEnv() : ({} as ServerEnv);
export const clientEnv = validateClientEnv();
