import {
  BookOpenIcon,
  CheckCircle2Icon,
  CircleIcon,
  LoaderCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ContentBrief = {
  assumptions: string[];
  audience: string;
  completionArtifact: string;
  exclusions: string[];
  language: string;
  prerequisites: string[];
  promise: string;
  scope: string[];
  title: string;
};

export type ChapterContract = {
  mustCover?: string[];
  purpose?: string;
  readerStateAfter?: string;
  readerStateBefore?: string;
};

export type ProjectSummary = {
  outline: {
    conceptCount: number;
    exampleCount: number;
    parts: Array<{
      chapters: Array<{
        contract: ChapterContract | null;
        editorialStatus: string;
        freshness?: string;
        hasContent?: boolean;
        id: string;
        position: number | null;
        title: string;
      }>;
      id: string;
      position: number | null;
      title: string;
    }>;
  };
  project: {
    briefJson: ContentBrief | null;
    id: string;
    seedInput: string;
    status: string;
    title: string;
  };
};

function getChapterState({
  editorialStatus,
  freshness,
  hasContent,
  isGenerating,
}: {
  editorialStatus: string;
  freshness?: string;
  hasContent?: boolean;
  isGenerating: boolean;
}) {
  if (isGenerating || editorialStatus === "drafting") {
    return {
      className: "text-primary",
      Icon: LoaderCircleIcon,
      label: "작성 중",
      spin: true,
    };
  }

  if (freshness === "stale") {
    return {
      className: "text-destructive",
      Icon: CircleIcon,
      label: "업데이트 필요",
      spin: false,
    };
  }

  if (hasContent) {
    return {
      className: "text-live",
      Icon: CheckCircle2Icon,
      label: "본문",
      spin: false,
    };
  }

  return {
    className: "text-muted-foreground",
    Icon: CircleIcon,
    label: "준비",
    spin: false,
  };
}

export function ContentStructure({
  generatingChapterId,
  onSelectChapter,
  selectedChapterId,
  summary,
}: {
  generatingChapterId?: string | null;
  onSelectChapter: (chapterId: string) => void;
  selectedChapterId: string | null;
  summary: ProjectSummary;
}) {
  const chapterCount = summary.outline.parts.reduce(
    (count, part) => count + part.chapters.length,
    0,
  );

  return (
    <nav aria-label="콘텐츠 구조" className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 py-5">
        <p className="text-sm font-semibold tracking-tight">콘텐츠 구조</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.outline.parts.length} Parts · {chapterCount} Chapters
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {summary.outline.parts.map((part, partIndex) => (
            <section key={part.id}>
              <div className="flex items-start gap-2 px-2 py-1.5">
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {String(partIndex + 1).padStart(2, "0")}
                </span>
                <h2 className="min-w-0 text-sm leading-5 font-medium">
                  {part.title}
                </h2>
              </div>

              <ol className="mt-1 space-y-0.5">
                {part.chapters.map((chapter, chapterIndex) => {
                  const state = getChapterState({
                    editorialStatus: chapter.editorialStatus,
                    freshness: chapter.freshness,
                    hasContent: chapter.hasContent,
                    isGenerating: generatingChapterId === chapter.id,
                  });
                  const isSelected = selectedChapterId === chapter.id;
                  const StateIcon = state.Icon;

                  return (
                    <li key={chapter.id}>
                      <button
                        aria-current={isSelected ? "page" : undefined}
                        className={cn(
                          "group flex min-h-12 w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/20",
                          isSelected && "bg-accent text-accent-foreground",
                        )}
                        onClick={() => onSelectChapter(chapter.id)}
                        type="button"
                      >
                        <StateIcon
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            state.className,
                            state.spin && "animate-spin",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm leading-5 font-medium">
                            {partIndex + 1}.{chapterIndex + 1} {chapter.title}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-xs leading-4",
                              state.className,
                            )}
                          >
                            {state.label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function ContentOutline({ summary }: { summary: ProjectSummary }) {
  const brief = summary.project.briefJson;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
      <header className="pb-9">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">구조 완성</Badge>
          <span className="text-xs text-muted-foreground">
            {summary.outline.parts.length} Parts ·{" "}
            {summary.outline.parts.reduce(
              (count, part) => count + part.chapters.length,
              0,
            )}{" "}
            Chapters
          </span>
        </div>
        <h2 className="mt-5 text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
          {summary.project.title}
        </h2>
        {brief ? (
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {brief.promise}
          </p>
        ) : null}
      </header>

      {brief ? (
        <div className="py-9">
          <section aria-labelledby="brief-title">
            <div className="flex items-center gap-2">
              <BookOpenIcon
                aria-hidden="true"
                className="size-4 text-primary"
              />
              <h3 className="text-sm font-semibold" id="brief-title">
                Content Brief
              </h3>
            </div>

            <dl className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  독자
                </dt>
                <dd className="mt-2 text-sm leading-6">{brief.audience}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  완성 결과
                </dt>
                <dd className="mt-2 text-sm leading-6">
                  {brief.completionArtifact}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="scope-title" className="mt-10">
            <h3 className="text-sm font-semibold" id="scope-title">
              다루는 범위
            </h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {brief.scope.map((item) => (
                <li className="flex gap-2 py-3 text-sm leading-6" key={item}>
                  <CheckCircle2Icon
                    aria-hidden="true"
                    className="mt-1 size-3.5 shrink-0 text-live"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      <footer className="border-t border-border pt-6">
        <p className="text-sm leading-6 text-muted-foreground">
          왼쪽 콘텐츠 구조에서 Chapter를 선택하면 역할과 범위를 검토하고 본문
          생성을 시작할 수 있습니다.
        </p>
      </footer>
    </article>
  );
}
