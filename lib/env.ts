import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

const runtimeSchema = z.object({
  NODE_ENV: nodeEnvSchema
});

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_DIRECT_URL: z.string().min(1, 'DATABASE_DIRECT_URL is required')
});

const authSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  OUR_JWT_SECRET: z.string().min(1, 'OUR_JWT_SECRET is required')
});

const aiSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required')
});

const supabaseSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  BOOK_GENERATION_JOB_SECRET: z.string().min(1, 'BOOK_GENERATION_JOB_SECRET is required'),
  APP_URL: z.string().url('APP_URL must be a valid URL')
});

const clientSchema = z.object({
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1)
});

const appServerSchema = runtimeSchema
  .extend(databaseSchema.shape)
  .extend(authSchema.shape)
  .extend(aiSchema.shape)
  .extend(supabaseSchema.shape)
  .extend(clientSchema.shape);

const workerServerSchema = runtimeSchema
  .extend(databaseSchema.shape)
  .extend(aiSchema.shape)
  .extend(supabaseSchema.shape);

const databaseEnvSchema = runtimeSchema.extend(databaseSchema.shape);
const aiEnvSchema = aiSchema;
const supabaseEnvSchema = supabaseSchema;

type AppServerEnv = z.infer<typeof appServerSchema>;
type WorkerServerEnv = z.infer<typeof workerServerSchema>;
type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
type AiEnv = z.infer<typeof aiEnvSchema>;
type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

const isServer = () => typeof window === 'undefined';

function summarizeEnvIssues(error: z.ZodError) {
  const missing = new Set<string>();
  const invalid: string[] = [];
  const other: string[] = [];

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '(root)';
    const message = issue.message;

    if (issue.code === 'invalid_type') {
      missing.add(path);
      continue;
    }

    if (message.toLowerCase().includes('required')) {
      missing.add(path);
      continue;
    }

    if (path === '(root)') {
      other.push(message);
      continue;
    }

    invalid.push(`${path}: ${message}`);
  }

  return {
    missing: [...missing].sort(),
    invalid,
    other
  };
}

function logEnvValidationError(label: string, error: z.ZodError) {
  const summary = summarizeEnvIssues(error);
  const parts: string[] = [];

  if (summary.missing.length > 0) {
    parts.push(`missing=${summary.missing.join(', ')}`);
  }

  if (summary.invalid.length > 0) {
    parts.push(`invalid=${summary.invalid.join(' | ')}`);
  }

  if (summary.other.length > 0) {
    parts.push(`other=${summary.other.join(' | ')}`);
  }

  console.error(`❌ Invalid ${label} environment variables`);

  if (parts.length > 0) {
    console.error(`❌ Details: ${parts.join(' ; ')}`);
  }

  console.error(
    JSON.stringify(error.format(), null, 2)
  );
}

function parseServerEnv<T>(schema: z.ZodType<T>, label: string): T {
  if (!isServer()) {
    throw new Error("❌ [Runtime Error] 'serverEnv'는 서버 런타임에서만 접근 가능합니다.");
  }

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    logEnvValidationError(label, parsed.error);
    throw new Error(`Invalid ${label} environment variables`);
  }

  return parsed.data;
}

function validateClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  });

  if (!parsed.success) {
    logEnvValidationError('client', parsed.error);
    throw new Error('Invalid client environment variables');
  }

  return parsed.data;
}

function getClientEnv(): ClientEnv {
  return validateClientEnv();
}

export const serverEnv = isServer()
  ? parseServerEnv(appServerSchema, 'app server')
  : ({} as AppServerEnv);

export const workerEnv = isServer()
  ? parseServerEnv(workerServerSchema, 'worker server')
  : ({} as WorkerServerEnv);

export const databaseEnv = isServer()
  ? parseServerEnv(databaseEnvSchema, 'database')
  : ({} as DatabaseEnv);

export const aiEnv = isServer()
  ? parseServerEnv(aiEnvSchema, 'ai')
  : ({} as AiEnv);

export const supabaseEnv = isServer()
  ? parseServerEnv(supabaseEnvSchema, 'supabase')
  : ({} as SupabaseEnv);

export const clientEnv = new Proxy({} as ClientEnv, {
  get(_target, property) {
    return getClientEnv()[property as keyof ClientEnv];
  }
});
