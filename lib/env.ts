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

const awsQueueSchema = z.object({
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_SQS_BOOK_GENERATION_QUEUE_URL: z
    .string()
    .url('AWS_SQS_BOOK_GENERATION_QUEUE_URL must be a valid URL')
});

const clientSchema = z.object({
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1)
});

const appServerSchema = runtimeSchema
  .merge(databaseSchema)
  .merge(authSchema)
  .merge(aiSchema)
  .merge(awsQueueSchema)
  .merge(clientSchema);

const workerServerSchema = runtimeSchema
  .merge(databaseSchema)
  .merge(aiSchema)
  .merge(awsQueueSchema);

const databaseEnvSchema = runtimeSchema.merge(databaseSchema);
const aiEnvSchema = aiSchema;
const awsQueueEnvSchema = awsQueueSchema;

type AppServerEnv = z.infer<typeof appServerSchema>;
type WorkerServerEnv = z.infer<typeof workerServerSchema>;
type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
type AiEnv = z.infer<typeof aiEnvSchema>;
type AwsQueueEnv = z.infer<typeof awsQueueEnvSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

const isServer = () => typeof window === 'undefined';

function parseServerEnv<T>(schema: z.ZodType<T>, label: string): T {
  if (!isServer()) {
    throw new Error("❌ [Runtime Error] 'serverEnv'는 서버 런타임에서만 접근 가능합니다.");
  }

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      `❌ Invalid ${label} environment variables:`,
      JSON.stringify(parsed.error.format(), null, 2)
    );
    throw new Error(`Invalid ${label} environment variables`);
  }

  return parsed.data;
}

function validateClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  });

  if (!parsed.success) {
    console.error(
      '❌ Invalid client environment variables:',
      JSON.stringify(parsed.error.format(), null, 2)
    );
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

export const awsQueueEnv = isServer()
  ? parseServerEnv(awsQueueEnvSchema, 'aws queue')
  : ({} as AwsQueueEnv);

export const clientEnv = new Proxy({} as ClientEnv, {
  get(_target, property) {
    return getClientEnv()[property as keyof ClientEnv];
  }
});
