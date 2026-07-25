export const AI_JOB_TASK_TYPES = ["content_generation"] as const;

export const AI_JOB_STATUSES = [
  "queued",
  "processing",
  "requires_action",
  "completed",
  "failed",
  "cancelled",
  "incomplete",
] as const;

export const AI_JOB_ERROR_STAGES = [
  "submission",
  "execution",
  "result_fetch",
  "webhook",
  "internal",
] as const;

export const WEBHOOK_EVENT_TYPES = [
  "interaction.requires_action",
  "interaction.completed",
  "interaction.failed",
  "interaction.cancelled",
] as const;

export const WEBHOOK_EVENT_STATUSES = [
  "received",
  "processing",
  "processed",
  "failed",
] as const;

export type AiJobTaskType = (typeof AI_JOB_TASK_TYPES)[number];
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];
export type AiJobErrorStage = (typeof AI_JOB_ERROR_STAGES)[number];
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export type AiJobInput = JsonObject;
export type AiJobResult = JsonObject;

export type AiJobUsage = {
  cachedTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  thoughtTokens?: number;
  toolUseTokens?: number;
  totalTokens?: number;
};

export type WebhookPayload = JsonObject;
