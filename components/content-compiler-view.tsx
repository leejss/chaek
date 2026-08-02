"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CircleIcon,
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
  type ProjectSummary,
} from "@/components/content-outline";
import {
  ChapterReader,
  type ChapterDetail,
} from "@/components/chapter-reader";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { createSignInPath } from "@/lib/auth/redirects";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 2_500;
const RETRY_INTERVAL_MS = 5_000;

const terminalBuildStatuses = new Set(["cancelled", "completed", "failed"]);

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
  initialSeedInput = "LLM From Scratch",
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
  const [seedInput, setSeedInput] = useState(initialSeedInput);
  const [activeBuild, setActiveBuild] = useState<ActiveBuild | null>(
    initialBuildId && initialProjectId
      ? {
          buildId: initialBuildId,
          projectId: initialProjectId,
          targetNodeId: initialNodeId ?? undefined,
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
  const [isLoadingChapter, setIsLoadingChapter] = useState(
    Boolean(initialNodeId),
  );
  const [isStartingChapter, setIsStartingChapter] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            nextStatus.targetNodeId ?? activeBuild.targetNodeId;
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
          setErrorMessage(
            nextStatus.targetNodeId
              ? "Chapter를 완성하지 못했습니다. 다시 시도해 주세요."
              : "콘텐츠 구조를 완성하지 못했습니다. 다시 시도해 주세요.",
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
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
    setSelectedChapterId(null);
    setChapterDetail(null);
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
    setSelectedChapterId(null);
    setChapterDetail(null);
    setIsLoadingChapter(false);
    setErrorMessage(null);
    startTransition(() => {
      router.replace("/content", { scroll: false });
    });
  };

  const handleSelectChapter = async (nodeId: string) => {
    if (!summary) {
      return;
    }

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

  return (
    <div className="py-12 sm:py-16">
      <section
        aria-labelledby="content-title"
        className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16"
      >
        <div className="lg:sticky lg:top-10 lg:self-start">
          <Badge
            variant={isRunning ? "secondary" : summary ? "success" : "outline"}
          >
            {isRunning
              ? isChapterBuild
                ? "Chapter 생성 중"
                : "생성 중"
              : summary
                ? "완료"
                : "Content Compiler"}
          </Badge>
          <h1
            className="mt-5 text-4xl leading-[1.08] font-medium tracking-[-0.045em] text-balance sm:text-5xl"
            id="content-title"
          >
            {summary?.project.title ?? "한 줄에서 콘텐츠 구조까지"}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            {summary?.project.briefJson?.promise ??
              "주제를 입력하면 독자와 목표를 해석하고, 여러 Part와 Chapter로 읽히는 독립 콘텐츠 구조를 만듭니다."}
          </p>

          {!activeBuild ? (
            <form className="mt-8" onSubmit={handleCreate}>
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="seed-input"
              >
                주제 또는 작업 지시
              </label>
              <textarea
                aria-describedby="seed-input-description"
                className="mt-2 min-h-32 w-full resize-y rounded-lg border border-input bg-card px-3.5 py-3 text-base leading-6 text-foreground shadow-control outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:bg-muted disabled:opacity-50 sm:text-sm"
                disabled={isCreating}
                id="seed-input"
                maxLength={2_000}
                onChange={(event) => handleSeedChange(event.target.value)}
                placeholder="예: LLM From Scratch"
                value={seedInput}
              />
              <p
                className="mt-2 text-xs leading-5 text-muted-foreground"
                id="seed-input-description"
              >
                대상 독자나 결과물의 형태를 함께 적으면 더 구체적인 구조를 만들
                수 있습니다.
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
                  {isCreating ? "생성 시작 중" : "콘텐츠 만들기"}
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
                  <ArrowRightIcon data-icon="inline-end" />
                </a>
              )}
            </form>
          ) : (
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    현재 상태
                  </p>
                  <p className="mt-1 text-sm font-medium" aria-live="polite">
                    {getBuildLabel(buildStatus)}
                  </p>
                </div>
                <Button
                  onClick={handleReset}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcwIcon data-icon="inline-start" />새 콘텐츠
                </Button>
              </div>

              <ol className="mt-6 space-y-4">
                {isChapterBuild ? (
                  <ProgressStep
                    complete={Boolean(
                      buildStatus?.progress.chapterCompleted,
                    )}
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
            </div>
          )}

          {errorMessage ? (
            <div
              className="mt-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive"
              role="alert"
            >
              <AlertCircleIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <p className="text-sm leading-6">{errorMessage}</p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          {chapterDetail ? (
            <ChapterReader
              chapter={chapterDetail}
              isGenerating={
                isStartingChapter || isSelectedChapterGenerating
              }
              onBack={handleBackToOutline}
              onGenerate={handleGenerateChapter}
            />
          ) : summary && !selectedChapterId ? (
            <ContentOutline
              onSelectChapter={handleSelectChapter}
              summary={summary}
            />
          ) : isLoadingChapter ? (
            <ChapterLoadingView />
          ) : (
            <EmptyContentView isRunning={isRunning} />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyContentView({ isRunning }: { isRunning: boolean }) {
  return (
    <div className="min-h-[32rem] rounded-2xl border border-border bg-card px-6 py-8 shadow-panel sm:px-9 sm:py-10">
      <div className="flex h-full min-h-[26rem] flex-col justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            CONTENT VIEW
          </p>
          <h2 className="mt-3 text-2xl font-medium tracking-[-0.035em]">
            {isRunning
              ? "구조를 만들고 있습니다"
              : "완성된 구조가 여기에 나타납니다"}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {isRunning
              ? "Brief가 완성되면 목차 설계가 이어집니다. 탭을 떠나도 돌아오는 순간 현재 상태부터 다시 확인합니다."
              : "Part와 Chapter의 읽는 순서, 각 장의 목적과 다룰 내용을 한 화면에서 확인할 수 있습니다."}
          </p>
        </div>

        <div aria-hidden="true" className="space-y-5 opacity-60">
          <div className="h-px bg-border" />
          {[0, 1, 2].map((item) => (
            <div className="space-y-3" key={item}>
              <div className="h-3 w-24 rounded-full bg-muted" />
              <div className="h-5 w-3/4 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChapterLoadingView() {
  return (
    <div className="min-h-[32rem] rounded-2xl border border-border bg-card px-6 py-8 shadow-panel sm:px-9 sm:py-10">
      <div className="flex min-h-[26rem] items-center justify-center">
        <div className="text-center">
          <LoaderCircleIcon
            aria-hidden="true"
            className="mx-auto size-5 animate-spin text-primary"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Chapter를 불러오고 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
