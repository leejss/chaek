"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CircleIcon,
  FileTextIcon,
  InfoIcon,
  Layers3Icon,
  ListTreeIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ContentOutline,
  ContentStructure,
  type ProjectSummary,
} from "@/components/content-outline";
import {
  ChapterInspector,
  ChapterReader,
  type ChapterDetail,
} from "@/components/chapter-reader";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { createSignInPath } from "@/lib/auth/redirects";
import { cn } from "@/lib/utils";

import styles from "./content-workspace.module.css";

const POLL_INTERVAL_MS = 2_500;
const RETRY_INTERVAL_MS = 5_000;

const terminalBuildStatuses = new Set(["cancelled", "completed", "failed"]);
const creationSteps = [
  ["01", "Brief", "독자와 목표, 범위를 정합니다."],
  ["02", "Structure", "Part와 Chapter의 순서를 설계합니다."],
  ["03", "Chapter", "선택한 Chapter부터 본문을 완성합니다."],
] as const;

type ActiveBuild = {
  buildId: string;
  targetNodeId?: string;
  projectId: string;
};

type BuildJob = {
  id: string;
  status: string;
  taskType: string;
};

type BuildStatus = {
  errorCode: string | null;
  id: string;
  phase: string;
  progress: {
    briefCompleted: boolean;
    chapterCompleted: boolean;
    graphCompleted: boolean;
    planned: number;
    stale: number;
  };
  projectId: string;
  status: string;
  targetNodeId: string | null;
  jobs: BuildJob[];
};

type CreateProjectResponse = {
  buildId: string;
  projectId: string;
  status: string;
};

type CreateChapterResponse = CreateProjectResponse & {
  nodeId: string;
};

class ApiResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiResponseError(
      response.status,
      `Request failed with status ${response.status}.`,
    );
  }

  return response.json() as Promise<T>;
}

function redirectToSignIn() {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  window.location.assign(
    createSignInPath({ error: "session_expired", returnTo }),
  );
}

function getBuildLabel(status: BuildStatus | null) {
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

function ProgressStep({
  complete,
  label,
  running,
}: {
  complete: boolean;
  label: string;
  running: boolean;
}) {
  const Icon = complete ? CheckIcon : running ? LoaderCircleIcon : CircleIcon;

  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border",
          complete
            ? "border-live/30 bg-live/10 text-live"
            : running
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn("size-3.5", running ? "animate-spin" : null)}
        />
      </span>
      <span
        className={
          complete || running ? "text-foreground" : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </li>
  );
}

export function ContentCompilerView({
  initialBuildId,
  initialNodeId,
  initialProjectId,
  initialSeedInput = "",
  isAuthenticated,
  signInReturnTo = "/content",
}: {
  initialBuildId: string | null;
  initialNodeId: string | null;
  initialProjectId: string | null;
  initialSeedInput?: string;
  isAuthenticated: boolean;
  signInReturnTo?: string;
}) {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);
  const chapterIdempotencyKeyRef = useRef<{
    key: string;
    nodeId: string;
  } | null>(null);
  const selectedChapterIdRef = useRef<string | null>(initialNodeId);
  const [seedInput, setSeedInput] = useState(initialSeedInput);
  const [activeBuild, setActiveBuild] = useState<ActiveBuild | null>(
    initialBuildId && initialProjectId
      ? {
          buildId: initialBuildId,
          projectId: initialProjectId,
        }
      : null,
  );
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    initialNodeId,
  );
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(
    Boolean(initialProjectId && !initialBuildId),
  );
  const [isLoadingChapter, setIsLoadingChapter] = useState(
    Boolean(initialNodeId),
  );
  const [isStartingChapter, setIsStartingChapter] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    selectedChapterIdRef.current = selectedChapterId;
  }, [selectedChapterId]);

  useEffect(() => {
    if (!initialProjectId || initialBuildId) {
      return;
    }

    const controller = new AbortController();

    const loadProject = async () => {
      setErrorMessage(null);

      try {
        setIsLoadingChapter(Boolean(initialNodeId));
        const summaryRequest = fetch(
          `/api/content-projects/${encodeURIComponent(initialProjectId)}`,
          { cache: "no-store", signal: controller.signal },
        ).then(readJson<ProjectSummary>);
        const chapterRequest = initialNodeId
          ? fetch(
              `/api/content-projects/${encodeURIComponent(initialProjectId)}/nodes/${encodeURIComponent(initialNodeId)}`,
              { cache: "no-store", signal: controller.signal },
            ).then(readJson<ChapterDetail>)
          : Promise.resolve(null);
        const [nextSummary, nextChapter] = await Promise.all([
          summaryRequest,
          chapterRequest,
        ]);

        setSummary(nextSummary);

        if (initialNodeId && nextChapter) {
          setSelectedChapterId(initialNodeId);
          setChapterDetail(nextChapter);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiResponseError && error.status === 401) {
          redirectToSignIn();
          return;
        }

        selectedChapterIdRef.current = null;
        setSelectedChapterId(null);
        setErrorMessage(
          error instanceof ApiResponseError && error.status === 404
            ? "이 콘텐츠 작업을 찾을 수 없습니다."
            : "콘텐츠를 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingProject(false);
          setIsLoadingChapter(false);
        }
      }
    };

    void loadProject();

    return () => controller.abort();
  }, [initialBuildId, initialNodeId, initialProjectId]);

  useEffect(() => {
    if (!activeBuild) {
      return;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let requestInFlight = false;

    const schedule = (delay: number) => {
      if (controller.signal.aborted || document.visibilityState === "hidden") {
        return;
      }

      timeoutId = setTimeout(() => {
        void poll();
      }, delay);
    };

    const loadSummary = async () => {
      const response = await fetch(
        `/api/content-projects/${encodeURIComponent(activeBuild.projectId)}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const nextSummary = await readJson<ProjectSummary>(response);
      setSummary(nextSummary);
    };

    const loadChapter = async (nodeId: string) => {
      const response = await fetch(
        `/api/content-projects/${encodeURIComponent(activeBuild.projectId)}/nodes/${encodeURIComponent(nodeId)}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const nextChapter = await readJson<ChapterDetail>(response);
      setSelectedChapterId(nodeId);
      setChapterDetail(nextChapter);
      setIsLoadingChapter(false);
    };

    const poll = async () => {
      if (controller.signal.aborted || requestInFlight) {
        return;
      }

      requestInFlight = true;

      try {
        const response = await fetch(
          `/api/content-projects/${encodeURIComponent(activeBuild.projectId)}/builds/${encodeURIComponent(activeBuild.buildId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const nextStatus = await readJson<BuildStatus>(response);
        setBuildStatus(nextStatus);
        setErrorMessage(null);

        if (nextStatus.status === "completed") {
          const targetNodeId =
            selectedChapterIdRef.current ??
            nextStatus.targetNodeId ??
            activeBuild.targetNodeId;
          const [summaryResult, chapterResult] = await Promise.allSettled([
            loadSummary(),
            targetNodeId ? loadChapter(targetNodeId) : Promise.resolve(),
          ]);

          if (summaryResult.status === "rejected") {
            throw summaryResult.reason;
          }

          if (chapterResult.status === "rejected") {
            if (
              chapterResult.reason instanceof ApiResponseError &&
              chapterResult.reason.status === 401
            ) {
              redirectToSignIn();
              return;
            }

            setIsLoadingChapter(false);
            setErrorMessage("완성된 Chapter를 불러오지 못했습니다.");
          }

          return;
        }

        if (nextStatus.status === "failed") {
          chapterIdempotencyKeyRef.current = null;
          setIsLoadingChapter(false);
          const targetNodeId =
            selectedChapterIdRef.current ?? nextStatus.targetNodeId;
          await Promise.allSettled([
            loadSummary(),
            targetNodeId
              ? loadChapter(targetNodeId)
              : Promise.resolve(),
          ]);
          setErrorMessage(
            nextStatus.targetNodeId
              ? "Chapter를 완성하지 못했습니다. 다시 시도해 주세요."
              : "콘텐츠 구조를 완성하지 못했습니다. 다시 시도해 주세요.",
          );
          return;
        }

        if (nextStatus.status === "cancelled") {
          chapterIdempotencyKeyRef.current = null;
          setIsLoadingChapter(false);
          const targetNodeId =
            selectedChapterIdRef.current ?? nextStatus.targetNodeId;
          await Promise.allSettled([
            loadSummary(),
            targetNodeId
              ? loadChapter(targetNodeId)
              : Promise.resolve(),
          ]);
          setErrorMessage(
            nextStatus.targetNodeId
              ? "Chapter 작업이 취소되었습니다. 다시 생성을 시작할 수 있습니다."
              : "콘텐츠 구조 작업이 취소되었습니다. 새 작업을 시작해 주세요.",
          );
          return;
        }

        if (!terminalBuildStatuses.has(nextStatus.status)) {
          schedule(POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiResponseError && error.status === 401) {
          redirectToSignIn();
          return;
        }

        if (error instanceof ApiResponseError && error.status === 404) {
          setErrorMessage("이 콘텐츠 작업을 찾을 수 없습니다.");
          return;
        }

        setErrorMessage(
          "진행 상태를 확인하지 못했습니다. 잠시 후 다시 시도합니다.",
        );
        schedule(RETRY_INTERVAL_MS);
      } finally {
        requestInFlight = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        return;
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      void poll();
    };

    const hydrateWorkspace = async () => {
      const nodeId = selectedChapterIdRef.current;
      const [, chapterResult] = await Promise.allSettled([
        loadSummary(),
        nodeId ? loadChapter(nodeId) : Promise.resolve(),
      ]);

      if (
        !controller.signal.aborted &&
        nodeId &&
        chapterResult.status === "rejected"
      ) {
        setIsLoadingChapter(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void hydrateWorkspace();
    void poll();

    return () => {
      controller.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeBuild]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedInput = seedInput.trim();

    if (normalizedInput.length < 3) {
      setErrorMessage("주제를 세 글자 이상 입력해 주세요.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage("콘텐츠를 생성하려면 로그인이 필요합니다.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setBuildStatus(null);
    setSummary(null);
    selectedChapterIdRef.current = null;
    setSelectedChapterId(null);
    setChapterDetail(null);
    setIsLoadingProject(false);
    setIsLoadingChapter(false);

    try {
      idempotencyKeyRef.current ??= `content-view:${window.crypto.randomUUID()}`;

      const response = await fetch("/api/content-projects", {
        body: JSON.stringify({ seedInput: normalizedInput }),
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKeyRef.current,
        },
        method: "POST",
      });
      const project = await readJson<CreateProjectResponse>(response);
      const nextBuild = {
        buildId: project.buildId,
        projectId: project.projectId,
      };

      setActiveBuild(nextBuild);
      startTransition(() => {
        const query = new URLSearchParams(nextBuild);
        router.replace(`/content?${query.toString()}`, { scroll: false });
        router.refresh();
      });
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        redirectToSignIn();
      } else {
        setErrorMessage(
          "콘텐츠 생성을 시작하지 못했습니다. 다시 시도해 주세요.",
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSeedChange = (value: string) => {
    setSeedInput(value);
    idempotencyKeyRef.current = null;
  };

  const handleReset = () => {
    idempotencyKeyRef.current = null;
    chapterIdempotencyKeyRef.current = null;
    setActiveBuild(null);
    setBuildStatus(null);
    setSummary(null);
    selectedChapterIdRef.current = null;
    setSelectedChapterId(null);
    setChapterDetail(null);
    setIsLoadingProject(false);
    setIsLoadingChapter(false);
    setErrorMessage(null);
    setSeedInput("");
    startTransition(() => {
      router.replace("/content", { scroll: false });
    });
  };

  const handleSelectChapter = async (nodeId: string) => {
    if (!summary) {
      return;
    }

    selectedChapterIdRef.current = nodeId;
    setSelectedChapterId(nodeId);
    setChapterDetail(null);
    setIsLoadingChapter(true);
    setErrorMessage(null);

    startTransition(() => {
      const query = new URLSearchParams({ projectId: summary.project.id });

      if (activeBuild?.buildId) {
        query.set("buildId", activeBuild.buildId);
      }

      query.set("nodeId", nodeId);
      router.replace(`/content?${query.toString()}`, { scroll: false });
    });

    try {
      const response = await fetch(
        `/api/content-projects/${encodeURIComponent(summary.project.id)}/nodes/${encodeURIComponent(nodeId)}`,
        { cache: "no-store" },
      );
      const chapter = await readJson<ChapterDetail>(response);
      setChapterDetail(chapter);
    } catch (error) {
      selectedChapterIdRef.current = null;
      setSelectedChapterId(null);

      if (error instanceof ApiResponseError && error.status === 401) {
        redirectToSignIn();
      } else if (error instanceof ApiResponseError && error.status === 404) {
        setErrorMessage("이 Chapter를 찾을 수 없습니다.");
      } else {
        setErrorMessage("Chapter를 불러오지 못했습니다.");
      }
    } finally {
      setIsLoadingChapter(false);
    }
  };

  const handleBackToOutline = () => {
    selectedChapterIdRef.current = null;
    setSelectedChapterId(null);
    setChapterDetail(null);
    setIsLoadingChapter(false);

    if (!summary) {
      return;
    }

    startTransition(() => {
      const query = new URLSearchParams({ projectId: summary.project.id });

      if (activeBuild?.buildId) {
        query.set("buildId", activeBuild.buildId);
      }

      router.replace(`/content?${query.toString()}`, { scroll: false });
    });
  };

  const handleGenerateChapter = async () => {
    if (!summary || !selectedChapterId) {
      return;
    }

    setIsStartingChapter(true);
    setErrorMessage(null);

    try {
      if (
        !chapterIdempotencyKeyRef.current ||
        chapterIdempotencyKeyRef.current.nodeId !== selectedChapterId
      ) {
        chapterIdempotencyKeyRef.current = {
          key: `chapter-view:${window.crypto.randomUUID()}`,
          nodeId: selectedChapterId,
        };
      }

      const response = await fetch(
        `/api/content-projects/${encodeURIComponent(summary.project.id)}/nodes/${encodeURIComponent(selectedChapterId)}/generate`,
        {
          headers: {
            "idempotency-key": chapterIdempotencyKeyRef.current.key,
          },
          method: "POST",
        },
      );
      const build = await readJson<CreateChapterResponse>(response);
      const nextBuild: ActiveBuild = {
        buildId: build.buildId,
        projectId: build.projectId,
        targetNodeId: build.nodeId,
      };

      setBuildStatus(null);
      setActiveBuild(nextBuild);
      startTransition(() => {
        const query = new URLSearchParams({
          buildId: build.buildId,
          nodeId: build.nodeId,
          projectId: build.projectId,
        });
        router.replace(`/content?${query.toString()}`, { scroll: false });
      });
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        redirectToSignIn();
      } else if (error instanceof ApiResponseError && error.status === 409) {
        setErrorMessage(
          "현재 Content Graph로 이 Chapter를 만들 수 없습니다.",
        );
      } else {
        setErrorMessage("Chapter 생성을 시작하지 못했습니다.");
      }
    } finally {
      setIsStartingChapter(false);
    }
  };

  const isRunning = Boolean(
    activeBuild &&
      (!buildStatus || !terminalBuildStatuses.has(buildStatus.status)),
  );
  const chapterBuildTarget =
    buildStatus?.targetNodeId ?? activeBuild?.targetNodeId ?? null;
  const isChapterBuild = Boolean(chapterBuildTarget);
  const isSelectedChapterGenerating = Boolean(
    selectedChapterId &&
      chapterBuildTarget === selectedChapterId &&
      isRunning,
  );
  const outlineSummary = summary?.outline.parts.length ? summary : null;

  return (
    <section aria-labelledby="content-title" className="bg-background">
      <h1 className="sr-only" id="content-title">
        {summary?.project.title ?? "콘텐츠 만들기"}
      </h1>

      <div className={styles.workspaceGrid}>
        <aside
          className={cn(
            styles.structureRail,
            "flex min-h-0 flex-col bg-muted/25",
          )}
        >
          {outlineSummary ? (
            <ContentStructure
              generatingChapterId={chapterBuildTarget}
              onSelectChapter={handleSelectChapter}
              selectedChapterId={selectedChapterId}
              summary={outlineSummary}
            />
          ) : (
            <StructurePlaceholder
              isRunning={isRunning}
              seedInput={seedInput}
            />
          )}
        </aside>

        <main
          className={cn(
            styles.canvas,
            "min-w-0 bg-card/30 md:col-start-2",
          )}
        >
          {errorMessage ? <ErrorNotice message={errorMessage} /> : null}

          {chapterDetail ? (
            <ChapterReader chapter={chapterDetail} />
          ) : outlineSummary && !selectedChapterId ? (
            <ContentOutline summary={outlineSummary} />
          ) : isLoadingProject || isLoadingChapter ? (
            <ChapterLoadingView
              label={
                isLoadingProject
                  ? "콘텐츠를 불러오고 있습니다"
                  : "Chapter를 불러오고 있습니다"
              }
            />
          ) : activeBuild ? (
            <PlanningCanvas
              buildStatus={buildStatus}
              isChapterBuild={isChapterBuild}
              seedInput={seedInput}
            />
          ) : (
            <NewContentCanvas
              isAuthenticated={isAuthenticated}
              isCreating={isCreating}
              onSeedChange={handleSeedChange}
              onSubmit={handleCreate}
              seedInput={seedInput}
              signInReturnTo={signInReturnTo}
            />
          )}
        </main>

        <aside
          className={cn(
            styles.inspector,
            "min-h-0 bg-muted/20 md:col-start-2",
          )}
        >
          {chapterDetail ? (
            <ChapterInspector
              chapter={chapterDetail}
              isGenerating={
                isStartingChapter || isSelectedChapterGenerating
              }
              onBack={handleBackToOutline}
              onGenerate={handleGenerateChapter}
            />
          ) : outlineSummary ? (
            <ProjectInspector
              onReset={handleReset}
              summary={outlineSummary}
            />
          ) : activeBuild ? (
            <BuildInspector
              buildStatus={buildStatus}
              isChapterBuild={isChapterBuild}
              isRunning={isRunning}
              onReset={handleReset}
            />
          ) : (
            <CreationInspector />
          )}
        </aside>
      </div>
    </section>
  );
}

function StructurePlaceholder({
  isRunning,
  seedInput,
}: {
  isRunning: boolean;
  seedInput: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-5 py-5">
        <p className="text-sm font-semibold tracking-tight">콘텐츠 구조</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isRunning ? "구조 설계 중" : "아직 생성되지 않음"}
        </p>
      </div>
      <div className="px-5 py-6">
        {seedInput ? (
          <p className="line-clamp-3 text-sm leading-6 font-medium">
            {seedInput}
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {isRunning
            ? "Brief가 완성되면 Part와 Chapter가 이곳에 순서대로 나타납니다."
            : "주제를 입력하면 Part와 Chapter의 읽는 순서를 설계합니다."}
        </p>
      </div>
    </div>
  );
}

function NewContentCanvas({
  isAuthenticated,
  isCreating,
  onSeedChange,
  onSubmit,
  seedInput,
  signInReturnTo,
}: {
  isAuthenticated: boolean;
  isCreating: boolean;
  onSeedChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  seedInput: string;
  signInReturnTo: string;
}) {
  return (
    <div className="flex min-h-128 items-center px-6 py-12 sm:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <Badge variant="outline">Content Compiler</Badge>
        <h2 className="mt-5 text-4xl leading-tight font-medium tracking-tight text-balance sm:text-5xl">
          한 줄에서 한 권의 구조까지
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          주제와 독자, 원하는 결과를 알려주세요. 먼저 Content Brief와 읽는
          순서를 설계한 뒤 Chapter별로 본문을 완성합니다.
        </p>

        <form className="mt-9" onSubmit={onSubmit}>
          <label className="text-sm font-medium" htmlFor="seed-input">
            주제 또는 작업 지시
          </label>
          <textarea
            aria-describedby="seed-input-description"
            autoFocus
            className="mt-2 min-h-36 w-full resize-y rounded-xl border border-input bg-card px-4 py-3.5 text-base leading-7 text-foreground shadow-control outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:bg-muted disabled:opacity-50 sm:text-sm"
            disabled={isCreating}
            id="seed-input"
            maxLength={2_000}
            onChange={(event) => onSeedChange(event.target.value)}
            placeholder="예: Python 개발자가 작은 Transformer를 직접 구현하며 LLM을 이해하는 책"
            value={seedInput}
          />
          <p
            className="mt-2 text-xs leading-5 text-muted-foreground"
            id="seed-input-description"
          >
            대상 독자, 다룰 범위, 완성 후 만들 결과를 함께 적으면 더 정확한
            구조를 만들 수 있습니다.
          </p>

          {isAuthenticated ? (
            <Button
              className="mt-5 w-full sm:w-auto"
              disabled={isCreating}
              size="lg"
              type="submit"
            >
              {isCreating ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <BookOpenIcon aria-hidden="true" data-icon="inline-start" />
              )}
              {isCreating ? "생성 시작 중" : "콘텐츠 구조 만들기"}
              {!isCreating ? (
                <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
              ) : null}
            </Button>
          ) : (
            <a
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-5 w-full sm:w-auto",
              )}
              href={createSignInPath({ returnTo: signInReturnTo })}
            >
              Google로 로그인
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            </a>
          )}
        </form>
      </div>
    </div>
  );
}

function PlanningCanvas({
  buildStatus,
  isChapterBuild,
  seedInput,
}: {
  buildStatus: BuildStatus | null;
  isChapterBuild: boolean;
  seedInput: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
      <Badge variant="secondary">
        {isChapterBuild ? "Chapter 작성 중" : "구조 설계 중"}
      </Badge>
      <h2 className="mt-5 text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
        {isChapterBuild
          ? "선택한 Chapter를 쓰고 있습니다"
          : "읽히는 순서를 만들고 있습니다"}
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
        {isChapterBuild
          ? "Chapter Contract와 앞뒤 구조를 함께 읽어 본문을 작성합니다. 완료되면 이 Canvas에서 바로 이어집니다."
          : "입력을 Content Brief로 해석한 뒤 Part와 Chapter의 역할, 순서와 범위를 설계합니다."}
      </p>

      {seedInput ? (
        <blockquote className="mt-9 border-l-2 border-primary/30 pl-5 text-sm leading-7">
          {seedInput}
        </blockquote>
      ) : null}

      <div className="mt-10 border-t border-border pt-8">
        <p className="text-xs font-medium text-muted-foreground">현재 상태</p>
        <p className="mt-2 text-lg font-medium" aria-live="polite">
          {getBuildLabel(buildStatus)}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          탭을 떠나도 작업은 계속됩니다. 돌아오면 저장된 상태에서 다시
          확인합니다.
        </p>
      </div>
    </div>
  );
}

function CreationInspector() {
  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-2">
        <InfoIcon aria-hidden="true" className="size-4" />
        <h2 className="text-sm font-semibold tracking-tight">
          만드는 순서
        </h2>
      </div>
      <ol className="mt-6 space-y-5">
        {creationSteps.map(([number, title, description]) => (
          <li className="flex gap-3" key={number}>
            <span className="font-mono text-xs text-muted-foreground">
              {number}
            </span>
            <span>
              <span className="block text-sm font-medium">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {description}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BuildInspector({
  buildStatus,
  isChapterBuild,
  isRunning,
  onReset,
}: {
  buildStatus: BuildStatus | null;
  isChapterBuild: boolean;
  isRunning: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col px-5 py-6">
      <div className="flex items-center gap-2">
        <LoaderCircleIcon
          aria-hidden="true"
          className={cn("size-4 text-primary", isRunning && "animate-spin")}
        />
        <h2 className="text-sm font-semibold tracking-tight">
          {isChapterBuild ? "Chapter 진행" : "구조 진행"}
        </h2>
      </div>
      <p className="mt-4 text-sm font-medium" aria-live="polite">
        {getBuildLabel(buildStatus)}
      </p>

      <ol className="mt-7 space-y-4 border-y border-border py-5">
        {isChapterBuild ? (
          <ProgressStep
            complete={Boolean(buildStatus?.progress.chapterCompleted)}
            label="선택한 Chapter 본문 작성"
            running={isRunning}
          />
        ) : (
          <>
            <ProgressStep
              complete={Boolean(buildStatus?.progress.briefCompleted)}
              label="입력 해석과 Brief"
              running={Boolean(
                isRunning && !buildStatus?.progress.briefCompleted,
              )}
            />
            <ProgressStep
              complete={Boolean(buildStatus?.progress.graphCompleted)}
              label="Part와 Chapter 설계"
              running={Boolean(
                isRunning &&
                  buildStatus?.progress.briefCompleted &&
                  !buildStatus.progress.graphCompleted,
              )}
            />
          </>
        )}
      </ol>

      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        {buildStatus?.status === "waiting_for_user"
          ? "현재 자동으로 처리할 수 없는 추가 확인이 필요합니다. 작업 상태는 계속 보존됩니다."
          : "진행 상태는 자동으로 확인합니다. 다른 탭에 있을 때는 조회를 멈추고, 돌아오면 즉시 이어서 확인합니다."}
      </p>

      <div className="mt-auto pt-9">
        <Button
          className="w-full"
          onClick={onReset}
          type="button"
          variant="outline"
        >
          <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
          새 콘텐츠
        </Button>
      </div>
    </div>
  );
}

function ProjectInspector({
  onReset,
  summary,
}: {
  onReset: () => void;
  summary: ProjectSummary;
}) {
  const chapterCount = summary.outline.parts.reduce(
    (count, part) => count + part.chapters.length,
    0,
  );
  const completedCount = summary.outline.parts.reduce(
    (count, part) =>
      count + part.chapters.filter((chapter) => chapter.hasContent).length,
    0,
  );

  return (
    <div className="flex min-h-full flex-col px-5 py-6">
      <div className="flex items-center gap-2">
        <FileTextIcon aria-hidden="true" className="size-4" />
        <h2 className="text-sm font-semibold tracking-tight">
          콘텐츠 정보
        </h2>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        구조가 준비되었습니다. 왼쪽에서 Chapter를 선택해 역할과 범위를
        확인하세요.
      </p>

      <dl className="mt-7 divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-4 py-4">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListTreeIcon aria-hidden="true" className="size-3.5" />
            Part
          </dt>
          <dd className="text-xs font-medium">
            {summary.outline.parts.length}개
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-4">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers3Icon aria-hidden="true" className="size-3.5" />
            Chapter
          </dt>
          <dd className="text-xs font-medium">{chapterCount}개</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-4">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpenIcon aria-hidden="true" className="size-3.5" />
            본문 완성
          </dt>
          <dd className="text-xs font-medium">
            {completedCount}/{chapterCount}
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-9">
        <Button
          className="w-full"
          onClick={onReset}
          type="button"
          variant="outline"
        >
          <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
          새 콘텐츠
        </Button>
      </div>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      className="mx-6 mt-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive sm:mx-10"
      role="alert"
    >
      <AlertCircleIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
      />
      <p className="text-sm leading-6">{message}</p>
    </div>
  );
}

function ChapterLoadingView({ label }: { label: string }) {
  return (
    <div className="flex min-h-128 items-center justify-center px-6 py-12">
      <div className="text-center">
        <LoaderCircleIcon
          aria-hidden="true"
          className="mx-auto size-5 animate-spin text-primary"
        />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
