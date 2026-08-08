"use client";

import { type Dispatch, useCallback, useEffect, useState } from "react";
import {
  ApiResponseError,
  isRetryableApiError,
  loadChapterDetail,
  loadProjectSummary,
  redirectToSignIn,
} from "@/components/content-compiler/api";
import { shouldPollBuild } from "@/components/content-compiler/build-status";
import type { ContentCompilerAction } from "@/components/content-compiler/content-compiler-state";
import type {
  ActiveBuild,
  BuildStatus,
} from "@/lib/content/contracts/workspace-api";

const HYDRATION_RETRY_INTERVAL_MS = 5_000;

export function useWorkspaceHydration({
  activeBuild,
  buildStatus,
  chapterIdempotencyKeyRef,
  dispatch,
  pollingError,
  selectedChapterIdRef,
  selectionEpochRef,
}: {
  activeBuild: ActiveBuild | null;
  buildStatus: BuildStatus | null;
  chapterIdempotencyKeyRef: {
    current: { key: string; nodeId: string } | null;
  };
  dispatch: Dispatch<ContentCompilerAction>;
  pollingError: string | null;
  selectedChapterIdRef: { current: string | null };
  selectionEpochRef: { current: number };
}) {
  const [hydrationErrorState, setHydrationError] = useState<{
    buildId: string;
    message: string;
  } | null>(null);
  const status = buildStatus?.status ?? null;
  const refreshStage =
    status && shouldPollBuild(status)
      ? "automatic"
      : (status ?? (pollingError ? "polling-error" : null));
  const targetNodeId =
    buildStatus?.targetNodeId ?? activeBuild?.targetNodeId ?? null;

  const clearHydrationError = useCallback(() => {
    setHydrationError(null);
  }, []);

  useEffect(() => {
    setHydrationError(null);

    if (!activeBuild || !refreshStage) {
      return;
    }

    let disposed = false;
    let requestController: AbortController | null = null;
    let retryPending = false;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const nodeId = selectedChapterIdRef.current ?? targetNodeId;
    const selectionEpoch = selectionEpochRef.current;

    const setError = (message: string) => {
      setHydrationError({ buildId: activeBuild.buildId, message });
    };

    const scheduleRetry = (hydrate: () => Promise<void>) => {
      retryPending = true;

      if (disposed || document.visibilityState === "hidden") {
        return;
      }

      retryTimeoutId = setTimeout(() => {
        retryPending = false;
        retryTimeoutId = null;
        void hydrate();
      }, HYDRATION_RETRY_INTERVAL_MS);
    };

    const hydrateWorkspace = async () => {
      if (disposed || document.visibilityState === "hidden") {
        retryPending = true;
        return;
      }

      const currentRequest = new AbortController();
      requestController = currentRequest;
      const [summaryResult, chapterResult] = await Promise.allSettled([
        loadProjectSummary(activeBuild.projectId, currentRequest.signal),
        nodeId
          ? loadChapterDetail(
              activeBuild.projectId,
              nodeId,
              currentRequest.signal,
            )
          : Promise.resolve(null),
      ]);

      if (requestController === currentRequest) {
        requestController = null;
      }

      if (disposed || currentRequest.signal.aborted) {
        return;
      }

      let shouldRetry = false;
      const selectionIsCurrent = selectionEpochRef.current === selectionEpoch;
      const summaryLoaded = summaryResult.status === "fulfilled";
      const chapterLoaded =
        !nodeId ||
        (selectionIsCurrent &&
          chapterResult.status === "fulfilled" &&
          chapterResult.value !== null);

      if (summaryLoaded) {
        dispatch({ type: "summaryLoaded", summary: summaryResult.value });
      } else if (
        summaryResult.reason instanceof ApiResponseError &&
        summaryResult.reason.status === 401
      ) {
        redirectToSignIn();
        return;
      } else if (refreshStage !== "automatic") {
        shouldRetry = isRetryableApiError(summaryResult.reason);
        setError(
          summaryResult.reason instanceof ApiResponseError &&
            summaryResult.reason.status === 404
            ? "이 콘텐츠 작업을 찾을 수 없습니다."
            : "콘텐츠를 불러오지 못했습니다.",
        );
      }

      if (
        nodeId &&
        selectionIsCurrent &&
        chapterResult.status === "fulfilled" &&
        chapterResult.value
      ) {
        dispatch({
          type: "chapterLoaded",
          chapter: chapterResult.value,
          nodeId,
        });
      } else if (nodeId && selectionIsCurrent) {
        dispatch({ type: "chapterLoadingStopped", nodeId });

        if (
          chapterResult.status === "rejected" &&
          chapterResult.reason instanceof ApiResponseError &&
          chapterResult.reason.status === 401
        ) {
          redirectToSignIn();
          return;
        }

        if (refreshStage === "completed") {
          setError("완성된 Chapter를 불러오지 못했습니다.");
        }

        if (
          refreshStage !== "automatic" &&
          chapterResult.status === "rejected"
        ) {
          shouldRetry ||= isRetryableApiError(chapterResult.reason);
        }
      }

      if (refreshStage === "failed") {
        setError(
          targetNodeId
            ? "Chapter를 완성하지 못했습니다. 다시 시도해 주세요."
            : "콘텐츠 구조를 완성하지 못했습니다. 다시 시도해 주세요.",
        );
      } else if (refreshStage === "cancelled") {
        setError(
          targetNodeId
            ? "Chapter 작업이 취소되었습니다. 다시 생성을 시작할 수 있습니다."
            : "콘텐츠 구조 작업이 취소되었습니다. 새 작업을 시작해 주세요.",
        );
      }

      if (refreshStage !== "automatic") {
        chapterIdempotencyKeyRef.current = null;
      }

      if (
        summaryLoaded &&
        chapterLoaded &&
        refreshStage !== "failed" &&
        refreshStage !== "cancelled"
      ) {
        setHydrationError(null);
      } else if (shouldRetry) {
        scheduleRetry(hydrateWorkspace);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId);
          retryTimeoutId = null;
          retryPending = true;
        }

        if (requestController) {
          requestController.abort();
          requestController = null;
          retryPending = true;
        }
        return;
      }

      if (retryPending && !requestController) {
        retryPending = false;
        void hydrateWorkspace();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void hydrateWorkspace();

    return () => {
      disposed = true;
      requestController?.abort();
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    activeBuild,
    chapterIdempotencyKeyRef,
    dispatch,
    refreshStage,
    selectedChapterIdRef,
    selectionEpochRef,
    targetNodeId,
  ]);

  return {
    clearHydrationError,
    hydrationError:
      hydrationErrorState &&
      hydrationErrorState.buildId === activeBuild?.buildId
        ? hydrationErrorState.message
        : null,
    targetNodeId,
  };
}
