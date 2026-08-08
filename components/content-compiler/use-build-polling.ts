"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiResponseError,
  readJson,
  redirectToSignIn,
} from "@/components/content-compiler/api";
import { shouldPollBuild } from "@/components/content-compiler/build-status";
import type {
  ActiveBuild,
  BuildStatus,
} from "@/lib/content/contracts/workspace-api";

const POLL_INTERVAL_MS = 2_500;
const RETRY_INTERVAL_MS = 5_000;

type UseBuildPollingResult = {
  buildStatus: BuildStatus | null;
  clearPollingError: () => void;
  isPollingHalted: boolean;
  pollingError: string | null;
};

export function useBuildPolling(
  activeBuild: ActiveBuild | null,
): UseBuildPollingResult {
  const projectId = activeBuild?.projectId ?? null;
  const buildId = activeBuild?.buildId ?? null;
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [haltedBuildId, setHaltedBuildId] = useState<string | null>(null);
  const [pollingErrorState, setPollingError] = useState<{
    buildId: string;
    message: string;
  } | null>(null);

  const clearPollingError = useCallback(() => {
    setPollingError(null);
  }, []);

  useEffect(() => {
    setBuildStatus(null);
    setHaltedBuildId(null);
    setPollingError(null);

    if (!projectId || !buildId) {
      return;
    }

    let pollingActive = true;
    let requestController: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearScheduledPoll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const schedulePoll = (poll: () => Promise<void>, delay: number) => {
      clearScheduledPoll();

      if (!pollingActive || document.visibilityState === "hidden") {
        return;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        void poll();
      }, delay);
    };

    const poll = async () => {
      if (
        !pollingActive ||
        requestController ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      const currentRequest = new AbortController();
      requestController = currentRequest;

      try {
        const response = await fetch(
          `/api/content-projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}`,
          {
            cache: "no-store",
            signal: currentRequest.signal,
          },
        );
        const nextStatus = await readJson<BuildStatus>(response);

        if (currentRequest.signal.aborted || !pollingActive) {
          return;
        }

        setBuildStatus(nextStatus);
        setPollingError(null);
        pollingActive = shouldPollBuild(nextStatus.status);
        setHaltedBuildId(pollingActive ? null : buildId);

        if (pollingActive) {
          schedulePoll(poll, POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (currentRequest.signal.aborted || !pollingActive) {
          return;
        }

        if (error instanceof ApiResponseError && error.status === 401) {
          pollingActive = false;
          redirectToSignIn();
          return;
        }

        if (error instanceof ApiResponseError && error.status === 404) {
          pollingActive = false;
          setBuildStatus(null);
          setHaltedBuildId(buildId);
          setPollingError({
            buildId,
            message: "이 콘텐츠 작업을 찾을 수 없습니다.",
          });
          return;
        }

        setPollingError({
          buildId,
          message: "진행 상태를 확인하지 못했습니다. 잠시 후 다시 시도합니다.",
        });
        schedulePoll(poll, RETRY_INTERVAL_MS);
      } finally {
        if (requestController === currentRequest) {
          requestController = null;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearScheduledPoll();
        requestController?.abort();
        requestController = null;
        return;
      }

      if (pollingActive) {
        clearScheduledPoll();
        void poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void poll();

    return () => {
      pollingActive = false;
      clearScheduledPoll();
      requestController?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [buildId, projectId]);

  return {
    buildStatus,
    clearPollingError,
    isPollingHalted: haltedBuildId === buildId,
    pollingError:
      pollingErrorState?.buildId === buildId ? pollingErrorState.message : null,
  };
}
