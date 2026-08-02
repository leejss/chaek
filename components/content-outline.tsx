import { Badge } from "@/components/ui/badge";

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

export function ContentOutline({
  onSelectChapter,
  summary,
}: {
  onSelectChapter?: (chapterId: string) => void;
  summary: ProjectSummary;
}) {
  const brief = summary.project.briefJson;

  return (
    <article className="rounded-2xl border border-border bg-card px-6 py-8 shadow-panel sm:px-9 sm:py-10">
      <header className="border-b border-border pb-8">
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
        <h2 className="mt-5 text-3xl leading-tight font-medium tracking-[-0.04em]">
          {summary.project.title}
        </h2>
        {brief ? (
          <dl className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                독자
              </dt>
              <dd className="mt-1.5 text-sm leading-6">{brief.audience}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                완성 결과
              </dt>
              <dd className="mt-1.5 text-sm leading-6">
                {brief.completionArtifact}
              </dd>
            </div>
          </dl>
        ) : null}
      </header>

      <div className="divide-y divide-border">
        {summary.outline.parts.map((part, partIndex) => (
          <section className="py-8" key={part.id}>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {String(partIndex + 1).padStart(2, "0")}
              </span>
              <h3 className="text-xl font-medium tracking-[-0.025em]">
                {part.title}
              </h3>
            </div>

            <ol className="mt-6 space-y-6">
              {part.chapters.map((chapter, chapterIndex) => (
                <li
                  className="grid gap-3 border-l border-border pl-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:border-l-0 sm:pl-0"
                  key={chapter.id}
                >
                  <span className="font-mono text-xs text-muted-foreground sm:pt-1">
                    {partIndex + 1}.{chapterIndex + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-medium">
                        {onSelectChapter ? (
                          <button
                            className="rounded-sm text-left outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/20"
                            onClick={() => onSelectChapter(chapter.id)}
                            type="button"
                          >
                            {chapter.title}
                          </button>
                        ) : (
                          chapter.title
                        )}
                      </h4>
                      {chapter.hasContent ? (
                        <Badge variant="success">본문</Badge>
                      ) : null}
                    </div>
                    {chapter.contract?.purpose ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {chapter.contract.purpose}
                      </p>
                    ) : null}
                    {chapter.contract?.mustCover?.length ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {chapter.contract.mustCover.slice(0, 4).map((item) => (
                          <li
                            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                            key={item}
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>Concepts {summary.outline.conceptCount}</span>
        <span>Examples {summary.outline.exampleCount}</span>
        <span>Graph version available</span>
      </footer>
    </article>
  );
}
