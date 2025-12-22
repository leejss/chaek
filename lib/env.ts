import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  OUR_JWT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
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
