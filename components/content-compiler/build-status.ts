import type { BuildStatus } from "@/lib/content/contracts/workspace-api";
import type { ContentBuildStatus } from "@/lib/db/schema/types";

function isAutomaticBuildStatus(status: ContentBuildStatus): boolean {
  switch (status) {
    case "queued":
    case "running":
      return true;
    case "waiting_for_user":
    case "partially_completed":
    case "completed":
    case "failed":
    case "cancelled":
      return false;
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled build status: ${String(value)}`);
}

export function shouldPollBuild(status: ContentBuildStatus): boolean {
  return isAutomaticBuildStatus(status);
}

export function shouldShowBuildSpinner(status: ContentBuildStatus): boolean {
  return isAutomaticBuildStatus(status);
}

export function getBuildLabel(status: BuildStatus | null): string {
  if (!status) {
    return "작업 확인 중";
  }

  if (status.status === "completed") {
    return status.targetNodeId ? "Chapter 완성" : "구조 완성";
  }

  if (status.status === "failed") {
    return status.targetNodeId ? "Chapter 생성 실패" : "생성 실패";
  }

  if (status.status === "cancelled") {
    return "작업 취소됨";
  }

  if (status.status === "waiting_for_user") {
    return "확인 필요";
  }

  if (status.status === "partially_completed") {
    return "일부 작업 완료";
  }

  if (status.targetNodeId) {
    return "Chapter 작성 중";
  }

  if (status.progress.briefCompleted) {
    return "목차 설계 중";
  }

  return "입력 해석 중";
}
