import {
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
import { getBuildLabel } from "@/components/content-compiler/build-status";
import type { ProjectSummary } from "@/components/content-outline";
import { Button } from "@/components/ui/button";
import type { BuildStatus } from "@/lib/content/contracts/workspace-api";
import { cn } from "@/lib/utils";

const creationSteps = [
  ["01", "Brief", "독자와 목표, 범위를 정합니다."],
  ["02", "Structure", "Part와 Chapter의 순서를 설계합니다."],
  ["03", "Chapter", "선택한 Chapter부터 본문을 완성합니다."],
] as const;

export function ProgressStep({
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

export function CreationInspector() {
  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-2">
        <InfoIcon aria-hidden="true" className="size-4" />
        <h2 className="text-sm font-semibold tracking-tight">만드는 순서</h2>
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

export function BuildInspector({
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
          <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />새 콘텐츠
        </Button>
      </div>
    </div>
  );
}

export function ProjectInspector({
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
        <h2 className="text-sm font-semibold tracking-tight">콘텐츠 정보</h2>
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
          <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />새 콘텐츠
        </Button>
      </div>
    </div>
  );
}
