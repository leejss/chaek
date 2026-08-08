import type { ChapterDetail } from "@/components/chapter-reader";
import type { ProjectSummary } from "@/components/content-outline";
import { createSignInPath } from "@/lib/auth/redirects";
import type {
  CreateChapterResponse,
  CreateProjectResponse,
} from "@/lib/content/contracts/workspace-api";

export class ApiResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiResponseError(
      response.status,
      `Request failed with status ${response.status}.`,
    );
  }

  return response.json() as Promise<T>;
}

export function redirectToSignIn() {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  window.location.assign(
    createSignInPath({ error: "session_expired", returnTo }),
  );
}

export async function loadProjectSummary(
  projectId: string,
  signal: AbortSignal,
) {
  const response = await fetch(
    `/api/content-projects/${encodeURIComponent(projectId)}`,
    { cache: "no-store", signal },
  );

  return readJson<ProjectSummary>(response);
}

export async function loadChapterDetail(
  projectId: string,
  nodeId: string,
  signal: AbortSignal,
) {
  const response = await fetch(
    `/api/content-projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`,
    { cache: "no-store", signal },
  );

  return readJson<ChapterDetail>(response);
}

export function getChapterLoadError(error: unknown) {
  return error instanceof ApiResponseError && error.status === 404
    ? "이 Chapter를 찾을 수 없습니다."
    : "Chapter를 불러오지 못했습니다.";
}

export function isRetryableApiError(error: unknown) {
  return !(error instanceof ApiResponseError) || error.status >= 500;
}

export async function createContentProject(
  seedInput: string,
  idempotencyKey: string,
) {
  const response = await fetch("/api/content-projects", {
    body: JSON.stringify({ seedInput }),
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    method: "POST",
  });

  return readJson<CreateProjectResponse>(response);
}

export async function createChapterBuild({
  idempotencyKey,
  nodeId,
  projectId,
  signal,
}: {
  idempotencyKey: string;
  nodeId: string;
  projectId: string;
  signal: AbortSignal;
}) {
  const response = await fetch(
    `/api/content-projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}/generate`,
    {
      headers: { "idempotency-key": idempotencyKey },
      method: "POST",
      signal,
    },
  );

  return readJson<CreateChapterResponse>(response);
}
