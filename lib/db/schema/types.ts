export const AI_JOB_TASK_TYPES = [
  "content_generation",
  "brief_generation",
  "graph_planning",
  "graph_repair",
  "node_research",
  "node_drafting",
  "node_review",
  "project_review",
  "node_revision",
] as const;

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
  "internal",
] as const;

export const AI_JOB_RESULT_DISPOSITIONS = [
  "pending",
  "applied",
  "rejected",
  "conflicted",
] as const;

export const CONTENT_PROJECT_STATUSES = [
  "planning",
  "drafting",
  "review",
  "ready",
  "published",
] as const;

export const CONTENT_NODE_KINDS = [
  "part",
  "chapter",
  "concept",
  "example",
] as const;

export const CONTENT_NODE_EDITORIAL_STATUSES = [
  "planned",
  "approved",
  "drafting",
  "review",
  "ready",
  "published",
] as const;

export const CONTENT_NODE_FRESHNESS_STATUSES = ["fresh", "stale"] as const;

export const CONTENT_EDGE_TYPES = [
  "requires",
  "introduces",
  "uses",
  "continues",
] as const;

export const CONTENT_BUILD_SCOPE_TYPES = [
  "project",
  "part",
  "chapter",
  "affected_subgraph",
] as const;

export const CONTENT_BUILD_PHASES = [
  "interpreting",
  "planning",
  "validating",
  "researching",
  "drafting",
  "reviewing",
  "revising",
  "finalizing",
] as const;

export const CONTENT_BUILD_STATUSES = [
  "queued",
  "running",
  "waiting_for_user",
  "partially_completed",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AiJobTaskType = (typeof AI_JOB_TASK_TYPES)[number];
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];
export type AiJobErrorStage = (typeof AI_JOB_ERROR_STAGES)[number];
export type AiJobResultDisposition =
  (typeof AI_JOB_RESULT_DISPOSITIONS)[number];
export type ContentProjectStatus = (typeof CONTENT_PROJECT_STATUSES)[number];
export type ContentNodeKind = (typeof CONTENT_NODE_KINDS)[number];
export type ContentNodeEditorialStatus =
  (typeof CONTENT_NODE_EDITORIAL_STATUSES)[number];
export type ContentNodeFreshnessStatus =
  (typeof CONTENT_NODE_FRESHNESS_STATUSES)[number];
export type ContentEdgeType = (typeof CONTENT_EDGE_TYPES)[number];
export type ContentBuildScopeType = (typeof CONTENT_BUILD_SCOPE_TYPES)[number];
export type ContentBuildPhase = (typeof CONTENT_BUILD_PHASES)[number];
export type ContentBuildStatus = (typeof CONTENT_BUILD_STATUSES)[number];

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
