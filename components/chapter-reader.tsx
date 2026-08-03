import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  InfoIcon,
  Layers3Icon,
  ListChecksIcon,
  LoaderCircleIcon,
  SearchXIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ChapterContentResult,
  ChapterContract,
} from "@/lib/content/contracts";

export type ChapterDetail = {
  content: ChapterContentResult | null;
  contract: ChapterContract;
  editorialStatus: string;
  id: string;
  part: {
    id: string;
    position: number | null;
    title: string;
  };
  position: number | null;
  project: {
    id: string;
    title: string;
  };
  title: string;
};

export function ChapterReader({ chapter }: { chapter: ChapterDetail }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
      <header className="border-b border-border pb-9">
        <p className="text-xs font-medium text-muted-foreground">
          {chapter.part.title}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant={chapter.content ? "success" : "outline"}>
            {chapter.content ? "Chapter 완성" : "Chapter Contract"}
          </Badge>
        </div>
        <h2 className="mt-5 text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
          {chapter.content?.title ?? chapter.title}
        </h2>
        {!chapter.content ? (
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {chapter.contract.purpose}
          </p>
        ) : null}
      </header>

      {chapter.content ? (
        <ChapterBody content={chapter.content} />
      ) : (
        <ChapterContractView contract={chapter.contract} />
      )}
    </article>
  );
}

function ChapterContractView({ contract }: { contract: ChapterContract }) {
  return (
    <div className="py-9">
      <section aria-labelledby="reader-change-title">
        <h3 className="text-sm font-semibold" id="reader-change-title">
          독자의 변화
        </h3>
        <dl className="mt-5 grid gap-7 sm:grid-cols-2 sm:gap-0">
          <div className="sm:border-r sm:border-border sm:pr-7">
            <dt className="text-xs font-medium text-muted-foreground">
              읽기 전
            </dt>
            <dd className="mt-2 text-sm leading-6">
              {contract.readerStateBefore}
            </dd>
          </div>
          <div className="sm:pl-7">
            <dt className="text-xs font-medium text-muted-foreground">
              읽은 후
            </dt>
            <dd className="mt-2 text-sm leading-6">
              {contract.readerStateAfter}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="must-cover-title"
        className="mt-10 border-t border-border pt-8"
      >
        <h3 className="text-sm font-semibold" id="must-cover-title">
          반드시 다룰 내용
        </h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {contract.mustCover.map((item) => (
            <li
              className="rounded-md border border-border bg-muted/55 px-2.5 py-1.5 text-xs text-muted-foreground"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="chapter-preview-title"
        className="mt-10 border-t border-border pt-8"
      >
        <h3 className="text-sm font-semibold" id="chapter-preview-title">
          본문이 만들어지면
        </h3>
        <div className="mt-5 space-y-5 text-sm leading-6 text-muted-foreground">
          <p>
            이 Chapter의 역할과 앞뒤 Chapter의 맥락을 함께 전달해 도입, 본문,
            코드 예제와 정리를 작성합니다.
          </p>
          <p>
            생성이 완료되면 같은 Canvas에서 본문을 읽고, 왼쪽 구조에서 다음
            Chapter로 바로 이동할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

function getEditorialLabel(status: string) {
  switch (status) {
    case "drafting":
      return "작성 중";
    case "review":
      return "검토 중";
    case "ready":
    case "published":
      return "완성";
    default:
      return "준비";
  }
}

export function ChapterInspector({
  chapter,
  isGenerating,
  onBack,
  onGenerate,
}: {
  chapter: ChapterDetail;
  isGenerating: boolean;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col px-5 py-6">
      <div>
        <div className="flex items-center gap-2">
          <BookOpenIcon aria-hidden="true" className="size-4" />
          <h2 className="text-sm font-semibold tracking-tight">
            Chapter {chapter.content ? "정보" : "준비"}
          </h2>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {chapter.content
            ? "완성된 본문과 구조 정보를 확인할 수 있습니다."
            : "Chapter Contract와 현재 Content Graph를 바탕으로 본문을 작성합니다."}
        </p>
      </div>

      <dl className="mt-7 divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-4 py-4">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2Icon aria-hidden="true" className="size-3.5" />
            현재 상태
          </dt>
          <dd className="text-xs font-medium">
            {isGenerating
              ? "작성 중"
              : getEditorialLabel(chapter.editorialStatus)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-4">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListChecksIcon aria-hidden="true" className="size-3.5" />
            다룰 내용
          </dt>
          <dd className="text-xs font-medium">
            {chapter.contract.mustCover.length}개
          </dd>
        </div>
        {chapter.content ? (
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers3Icon aria-hidden="true" className="size-3.5" />
              본문 Section
            </dt>
            <dd className="text-xs font-medium">
              {chapter.content.sections.length}개
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-7 flex gap-2 text-muted-foreground">
        <SearchXIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="text-xs leading-5">
          현재 Chapter 생성에는 검색 기반 근거(Grounding)가 포함되지 않습니다.
        </p>
      </div>

      <div className="mt-auto pt-9">
        {chapter.content ? (
          <div className="flex gap-2 rounded-lg border border-live/25 bg-live/5 p-3 text-live">
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-5">이 Chapter의 본문이 완성되었습니다.</p>
          </div>
        ) : (
          <Button
            className="w-full"
            disabled={isGenerating}
            onClick={onGenerate}
            size="lg"
            type="button"
          >
            {isGenerating ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <BookOpenIcon aria-hidden="true" data-icon="inline-start" />
            )}
            {isGenerating ? "Chapter 작성 중" : "이 Chapter 만들기"}
          </Button>
        )}
        <Button
          className="mt-2 w-full"
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
          목차로 돌아가기
        </Button>
      </div>
    </div>
  );
}

function ChapterBody({ content }: { content: ChapterContentResult }) {
  return (
    <div className="py-10">
      <div className="space-y-5 text-base leading-8">
        {content.introduction.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-12 space-y-12">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-xl font-medium tracking-tight">
              {section.heading}
            </h3>
            <div className="mt-5 space-y-5 text-base leading-8">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.codeExamples.map((example, index) => (
              <figure className="mt-7" key={`${example.language}-${index}`}>
                <figcaption className="mb-2 text-xs font-medium text-muted-foreground">
                  {example.language}
                </figcaption>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-sm leading-6">
                  <code>{example.code}</code>
                </pre>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {example.explanation}
                </p>
              </figure>
            ))}
          </section>
        ))}
      </div>

      <section className="mt-12 border-t border-border pt-9">
        <h3 className="text-xl font-medium tracking-tight">정리</h3>
        <div className="mt-5 space-y-5 text-base leading-8">
          {content.conclusion.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <ul className="mt-7 space-y-3 border-l-2 border-primary/30 pl-5">
          {content.keyTakeaways.map((item) => (
            <li className="text-sm leading-6" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
