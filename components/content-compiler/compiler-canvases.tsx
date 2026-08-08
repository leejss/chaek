// biome-ignore-all lint/a11y/noAutofocus: 새 콘텐츠 화면의 주 입력란으로 기존 포커스 동작을 유지합니다.
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  LoaderCircleIcon,
} from "lucide-react";
import type { FormEvent } from "react";
import { getBuildLabel } from "@/components/content-compiler/build-status";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { createSignInPath } from "@/lib/auth/redirects";
import type { BuildStatus } from "@/lib/content/contracts/workspace-api";
import { cn } from "@/lib/utils";

export function StructurePlaceholder({
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

export function NewContentCanvas({
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

export function PlanningCanvas({
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

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      className="mx-6 mt-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive sm:mx-10"
      role="alert"
    >
      <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="text-sm leading-6">{message}</p>
    </div>
  );
}

export function ChapterLoadingView({ label }: { label: string }) {
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
