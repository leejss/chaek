import { ArrowLeftIcon, BookOpenIcon, LoaderCircleIcon } from "lucide-react";

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

export function ChapterReader({
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
    <article className="rounded-2xl border border-border bg-card px-6 py-8 shadow-panel sm:px-9 sm:py-10">
      <header className="border-b border-border pb-8">
        <Button onClick={onBack} size="sm" type="button" variant="ghost">
          <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
          목차
        </Button>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge variant={chapter.content ? "success" : "outline"}>
            {chapter.content ? "Chapter 완성" : "Chapter Contract"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {chapter.part.title}
          </span>
        </div>
        <h2 className="mt-5 text-3xl leading-tight font-medium tracking-[-0.04em]">
          {chapter.content?.title ?? chapter.title}
        </h2>
        {!chapter.content ? (
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {chapter.contract.purpose}
          </p>
        ) : null}
      </header>

      {chapter.content ? (
        <ChapterBody content={chapter.content} />
      ) : (
        <ChapterGenerationPrompt
          chapter={chapter}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
        />
      )}
    </article>
  );
}

function ChapterGenerationPrompt({
  chapter,
  isGenerating,
  onGenerate,
}: {
  chapter: ChapterDetail;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="py-8">
      <dl className="grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            읽기 전
          </dt>
          <dd className="mt-2 text-sm leading-6">
            {chapter.contract.readerStateBefore}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            읽은 후
          </dt>
          <dd className="mt-2 text-sm leading-6">
            {chapter.contract.readerStateAfter}
          </dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-border pt-7">
        <h3 className="text-sm font-medium">반드시 다룰 내용</h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {chapter.contract.mustCover.map((item) => (
            <li
              className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-9 border-t border-border pt-7">
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          이 Chapter의 역할과 앞뒤 Chapter, 연결된 Concept을 함께 전달해 본문을
          작성합니다. 이 단계에서는 Google Search Grounding을 사용하지
          않습니다.
        </p>
        <Button
          className="mt-5"
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
      </div>
    </div>
  );
}

function ChapterBody({ content }: { content: ChapterContentResult }) {
  return (
    <div className="py-9">
      <div className="space-y-5 text-[0.98rem] leading-8">
        {content.introduction.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-12 space-y-12">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-xl font-medium tracking-[-0.025em]">
              {section.heading}
            </h3>
            <div className="mt-5 space-y-5 text-[0.98rem] leading-8">
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
        <h3 className="text-xl font-medium tracking-[-0.025em]">정리</h3>
        <div className="mt-5 space-y-5 text-[0.98rem] leading-8">
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
