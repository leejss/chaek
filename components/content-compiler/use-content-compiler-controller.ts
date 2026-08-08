"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  startTransition,
  useEffect,
  useReducer,
  useRef,
} from "react";
import {
  ApiResponseError,
  createChapterBuild,
  createContentProject,
  getChapterLoadError,
  loadChapterDetail,
  loadProjectSummary,
  redirectToSignIn,
} from "@/components/content-compiler/api";
import { shouldShowBuildSpinner } from "@/components/content-compiler/build-status";
import {
  contentCompilerReducer,
  createContentCompilerState,
} from "@/components/content-compiler/content-compiler-state";
import { useBuildPolling } from "@/components/content-compiler/use-build-polling";
import { useWorkspaceHydration } from "@/components/content-compiler/use-workspace-hydration";
import {
  createWorkspacePath,
  toggleWorkspacePanel,
  type WorkspacePanelLayout,
} from "@/components/content-compiler/workspace-navigation";
import type { ActiveBuild } from "@/lib/content/contracts/workspace-api";

type ContentCompilerControllerOptions = {
  initialBuildId: string | null;
  initialNodeId: string | null;
  initialPanelLayout: WorkspacePanelLayout;
  initialProjectId: string | null;
  initialSeedInput: string;
  isAuthenticated: boolean;
};

export function useContentCompilerController({
  initialBuildId,
  initialNodeId,
  initialPanelLayout,
  initialProjectId,
  initialSeedInput,
  isAuthenticated,
}: ContentCompilerControllerOptions) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    contentCompilerReducer,
    createContentCompilerState({
      initialBuildId,
      initialNodeId,
      initialPanelLayout,
      initialProjectId,
      initialSeedInput,
    }),
  );
  const idempotencyKeyRef = useRef<string | null>(null);
  const chapterIdempotencyKeyRef = useRef<{
    key: string;
    nodeId: string;
  } | null>(null);
  const chapterGenerationRequestRef = useRef<AbortController | null>(null);
  const chapterRequestRef = useRef<AbortController | null>(null);
  const initialNodeIdRef = useRef(initialNodeId);
  const panelLayoutRef = useRef(initialPanelLayout);
  const selectionEpochRef = useRef(0);
  const selectedChapterIdRef = useRef<string | null>(initialNodeId);
  const { buildStatus, clearPollingError, isPollingHalted, pollingError } =
    useBuildPolling(state.activeBuild);
  const currentBuildStatus =
    buildStatus?.id === state.activeBuild?.buildId ? buildStatus : null;

  useEffect(() => {
    selectedChapterIdRef.current = state.selectedChapterId;
  }, [state.selectedChapterId]);

  useEffect(() => {
    return () => {
      chapterGenerationRequestRef.current?.abort();
      chapterRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!initialProjectId || initialBuildId) {
      return;
    }

    const controller = new AbortController();
    const nodeId = initialNodeIdRef.current;

    const loadProject = async () => {
      dispatch({ type: "errorChanged", message: null });

      try {
        const [summary, chapter] = await Promise.all([
          loadProjectSummary(initialProjectId, controller.signal),
          nodeId
            ? loadChapterDetail(initialProjectId, nodeId, controller.signal)
            : Promise.resolve(null),
        ]);

        dispatch({
          type: "projectLoaded",
          chapter,
          nodeId,
          summary,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiResponseError && error.status === 401) {
          redirectToSignIn();
          return;
        }

        selectedChapterIdRef.current = null;
        dispatch({
          type: "projectLoadFailed",
          message:
            error instanceof ApiResponseError && error.status === 404
              ? "이 콘텐츠 작업을 찾을 수 없습니다."
              : "콘텐츠를 불러오지 못했습니다.",
        });
      }
    };

    void loadProject();
    return () => controller.abort();
  }, [initialBuildId, initialProjectId]);

  const buildStatusValue = currentBuildStatus?.status ?? null;
  const {
    clearHydrationError,
    hydrationError,
    targetNodeId: buildTargetNodeId,
  } = useWorkspaceHydration({
    activeBuild: state.activeBuild,
    buildStatus: currentBuildStatus,
    chapterIdempotencyKeyRef,
    dispatch,
    pollingError,
    selectedChapterIdRef,
    selectionEpochRef,
  });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedInput = state.seedInput.trim();

    if (normalizedInput.length < 3) {
      dispatch({
        type: "errorChanged",
        message: "주제를 세 글자 이상 입력해 주세요.",
      });
      return;
    }

    if (!isAuthenticated) {
      dispatch({
        type: "errorChanged",
        message: "콘텐츠를 생성하려면 로그인이 필요합니다.",
      });
      return;
    }

    dispatch({ type: "createStarted" });
    panelLayoutRef.current = "both";
    clearHydrationError();
    clearPollingError();
    selectedChapterIdRef.current = null;

    try {
      idempotencyKeyRef.current ??= `content-view:${window.crypto.randomUUID()}`;
      const project = await createContentProject(
        normalizedInput,
        idempotencyKeyRef.current,
      );
      const activeBuild: ActiveBuild = {
        buildId: project.buildId,
        projectId: project.projectId,
      };

      dispatch({ type: "buildStarted", activeBuild });
      startTransition(() => {
        router.replace(
          createWorkspacePath({
            ...activeBuild,
            panels: panelLayoutRef.current,
          }),
          { scroll: false },
        );
      });
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        redirectToSignIn();
      } else {
        dispatch({
          type: "errorChanged",
          message: "콘텐츠 생성을 시작하지 못했습니다. 다시 시도해 주세요.",
        });
      }
    } finally {
      dispatch({ type: "createFinished" });
    }
  };

  const handleSeedChange = (value: string) => {
    idempotencyKeyRef.current = null;
    dispatch({ type: "seedChanged", value });
  };

  const handleReset = () => {
    chapterGenerationRequestRef.current?.abort();
    chapterGenerationRequestRef.current = null;
    chapterRequestRef.current?.abort();
    chapterRequestRef.current = null;
    idempotencyKeyRef.current = null;
    chapterIdempotencyKeyRef.current = null;
    selectedChapterIdRef.current = null;
    panelLayoutRef.current = "both";
    selectionEpochRef.current += 1;
    clearHydrationError();
    clearPollingError();
    dispatch({ type: "reset" });
    startTransition(() => router.replace("/content", { scroll: false }));
  };

  const handleSelectChapter = async (nodeId: string) => {
    if (!state.summary) {
      return;
    }

    const projectId = state.summary.project.id;
    const buildId = state.activeBuild?.buildId;
    chapterGenerationRequestRef.current?.abort();
    chapterGenerationRequestRef.current = null;
    chapterRequestRef.current?.abort();
    const requestController = new AbortController();
    chapterRequestRef.current = requestController;
    selectedChapterIdRef.current = nodeId;
    selectionEpochRef.current += 1;
    clearHydrationError();
    clearPollingError();
    dispatch({ type: "chapterSelected", nodeId });

    startTransition(() => {
      router.replace(
        createWorkspacePath({
          buildId,
          nodeId,
          panels: panelLayoutRef.current,
          projectId,
        }),
        { scroll: false },
      );
    });

    try {
      const chapter = await loadChapterDetail(
        projectId,
        nodeId,
        requestController.signal,
      );

      if (!requestController.signal.aborted) {
        dispatch({ type: "chapterLoaded", chapter, nodeId });
      }
    } catch (error) {
      if (requestController.signal.aborted) {
        return;
      }

      if (error instanceof ApiResponseError && error.status === 401) {
        redirectToSignIn();
      } else {
        selectedChapterIdRef.current = null;
        dispatch({
          type: "chapterLoadFailed",
          message: getChapterLoadError(error),
          nodeId,
        });
        startTransition(() => {
          router.replace(
            createWorkspacePath({
              buildId,
              panels: panelLayoutRef.current,
              projectId,
            }),
            { scroll: false },
          );
        });
      }
    } finally {
      if (chapterRequestRef.current === requestController) {
        chapterRequestRef.current = null;
      }
    }
  };

  const handleBackToOutline = () => {
    chapterGenerationRequestRef.current?.abort();
    chapterGenerationRequestRef.current = null;
    chapterRequestRef.current?.abort();
    chapterRequestRef.current = null;
    selectedChapterIdRef.current = null;
    selectionEpochRef.current += 1;
    clearHydrationError();
    dispatch({ type: "backToOutline" });

    if (state.summary) {
      startTransition(() => {
        router.replace(
          createWorkspacePath({
            buildId: state.activeBuild?.buildId,
            panels: panelLayoutRef.current,
            projectId: state.summary?.project.id ?? "",
          }),
          { scroll: false },
        );
      });
    }
  };

  const handleGenerateChapter = async () => {
    if (!state.summary || !state.selectedChapterId) {
      return;
    }

    const nodeId = state.selectedChapterId;
    const projectId = state.summary.project.id;
    const requestController = new AbortController();
    chapterGenerationRequestRef.current?.abort();
    chapterGenerationRequestRef.current = requestController;
    dispatch({ type: "chapterGenerationStarted" });
    clearHydrationError();
    clearPollingError();

    try {
      if (
        !chapterIdempotencyKeyRef.current ||
        chapterIdempotencyKeyRef.current.nodeId !== nodeId
      ) {
        chapterIdempotencyKeyRef.current = {
          key: `chapter-view:${window.crypto.randomUUID()}`,
          nodeId,
        };
      }

      const build = await createChapterBuild({
        idempotencyKey: chapterIdempotencyKeyRef.current.key,
        nodeId,
        projectId,
        signal: requestController.signal,
      });

      if (
        requestController.signal.aborted ||
        chapterGenerationRequestRef.current !== requestController ||
        selectedChapterIdRef.current !== nodeId
      ) {
        return;
      }
      const activeBuild: ActiveBuild = {
        buildId: build.buildId,
        projectId: build.projectId,
        targetNodeId: build.nodeId,
      };

      chapterIdempotencyKeyRef.current = null;
      dispatch({ type: "buildStarted", activeBuild });
      startTransition(() => {
        router.replace(
          createWorkspacePath({
            buildId: build.buildId,
            nodeId: build.nodeId,
            panels: panelLayoutRef.current,
            projectId: build.projectId,
          }),
          { scroll: false },
        );
      });
    } catch (error) {
      if (requestController.signal.aborted) {
        return;
      }

      if (error instanceof ApiResponseError && error.status === 401) {
        redirectToSignIn();
      } else if (error instanceof ApiResponseError && error.status === 409) {
        dispatch({
          type: "errorChanged",
          message: "현재 Content Graph로 이 Chapter를 만들 수 없습니다.",
        });
      } else {
        dispatch({
          type: "errorChanged",
          message: "Chapter 생성을 시작하지 못했습니다.",
        });
      }
    } finally {
      if (chapterGenerationRequestRef.current === requestController) {
        chapterGenerationRequestRef.current = null;
        dispatch({ type: "chapterGenerationFinished" });
      }
    }
  };

  const handleTogglePanel = (panel: "inspector" | "structure") => {
    const panelLayout = toggleWorkspacePanel(panelLayoutRef.current, panel);
    panelLayoutRef.current = panelLayout;
    dispatch({ type: "panelLayoutChanged", panelLayout });

    const projectId =
      state.activeBuild?.projectId ??
      state.summary?.project.id ??
      initialProjectId;

    if (!projectId) {
      return;
    }

    window.history.replaceState(
      null,
      "",
      createWorkspacePath({
        buildId: state.activeBuild?.buildId,
        nodeId: state.selectedChapterId,
        panels: panelLayout,
        projectId,
      }),
    );
  };

  const isRunning = Boolean(
    state.activeBuild &&
      !isPollingHalted &&
      (!buildStatusValue || shouldShowBuildSpinner(buildStatusValue)),
  );
  const outlineSummary = state.summary?.outline.parts.length
    ? state.summary
    : null;

  return {
    ...state,
    buildStatus: currentBuildStatus,
    chapterBuildTarget: buildTargetNodeId,
    errorMessage: state.errorMessage ?? pollingError ?? hydrationError,
    handleBackToOutline,
    handleCreate,
    handleGenerateChapter,
    handleReset,
    handleSeedChange,
    handleSelectChapter,
    handleToggleInspector: () => handleTogglePanel("inspector"),
    handleToggleStructure: () => handleTogglePanel("structure"),
    isChapterBuild: Boolean(buildTargetNodeId),
    isRunning,
    isSelectedChapterGenerating: Boolean(
      state.selectedChapterId &&
        buildTargetNodeId === state.selectedChapterId &&
        isRunning,
    ),
    outlineSummary,
  };
}
