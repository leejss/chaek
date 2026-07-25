import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  SearchIcon,
} from "lucide-react";

import { ThemeMenu } from "@/components/theme-menu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const principles = [
  {
    number: "01",
    title: "콘텐츠가 먼저",
    description: "장식은 정보의 순서와 의미를 설명할 때만 사용합니다.",
  },
  {
    number: "02",
    title: "선으로 묶기",
    description: "떠 있는 카드 대신 hairline rule로 관계와 구획을 만듭니다.",
  },
  {
    number: "03",
    title: "한 번에 한 강조",
    description: "색, 굵기, 크기를 동시에 키우지 않고 한 축만 선택합니다.",
  },
  {
    number: "04",
    title: "밀도에는 리듬",
    description:
      "공간을 무조건 넓히기보다 반복 가능한 간격으로 읽는 속도를 만듭니다.",
  },
];

const colorTokens = [
  {
    name: "background",
    role: "페이지 캔버스",
    className: "bg-background",
  },
  {
    name: "foreground",
    role: "주요 텍스트",
    className: "bg-foreground",
  },
  {
    name: "muted",
    role: "보조 표면",
    className: "bg-muted",
  },
  {
    name: "muted-foreground",
    role: "메타데이터",
    className: "bg-muted-foreground",
  },
  {
    name: "primary",
    role: "주요 행동",
    className: "bg-primary",
  },
  {
    name: "accent",
    role: "선택 상태",
    className: "bg-accent",
  },
  {
    name: "rule",
    role: "기본 구분선",
    className: "bg-rule",
  },
  {
    name: "live",
    role: "긴급 상태",
    className: "bg-live",
  },
];

const navItems = [
  ["원칙", "#foundations"],
  ["타이포그래피", "#typography"],
  ["컬러", "#color"],
  ["컴포넌트", "#components"],
  ["패턴", "#patterns"],
] as const;

function RulePair() {
  return (
    <div aria-hidden="true" className="space-y-[3px] py-1">
      <div className="h-px bg-rule-strong" />
      <div className="h-px bg-rule-strong" />
    </div>
  );
}

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="font-sans text-[0.6875rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {index}
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-tight font-bold tracking-[-0.02em] text-balance sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function DesignCatalog() {
  return (
    <>
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-16 bg-foreground px-3 py-2 text-xs font-bold text-background focus:translate-y-0"
      >
        본문으로 건너뛰기
      </a>

      <header className="border-b border-rule bg-background">
        <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
          <nav
            aria-label="디자인 시스템 보조 메뉴"
            className="hidden h-10 items-center justify-center gap-7 font-sans text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase md:flex"
          >
            <a className="text-foreground" href="#foundations">
              Design system
            </a>
            <a className="hover:text-foreground" href="#typography">
              Foundations
            </a>
            <a className="hover:text-foreground" href="#components">
              Components
            </a>
            <a className="hover:text-foreground" href="#patterns">
              Patterns
            </a>
          </nav>

          <div className="grid min-h-28 grid-cols-[1fr_auto] items-center gap-5 py-5 md:grid-cols-[1fr_auto_1fr]">
            <div className="hidden text-sm leading-6 md:block">
              <p className="font-semibold">2026년 7월 25일 토요일</p>
              <p className="text-muted-foreground">
                Editorial interface system
              </p>
            </div>

            <div className="text-center md:col-start-2">
              <a
                href="#main-content"
                className="inline-flex items-center gap-3"
                aria-label="Chaek 디자인 시스템 홈"
              >
                <BookOpenIcon className="size-5 sm:size-6" strokeWidth={1.5} />
                <span className="font-serif text-4xl leading-none font-black tracking-[-0.055em] sm:text-6xl">
                  CHAEK
                </span>
              </a>
              <p className="mt-2 font-sans text-[0.625rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                Read before decorate
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 md:col-start-3">
              <ThemeMenu />
              <a
                href="#components"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                UI 살펴보기
              </a>
            </div>
          </div>

          <nav
            aria-label="디자인 시스템 주요 메뉴"
            className="flex items-center justify-start gap-7 overflow-x-auto py-3 text-sm whitespace-nowrap md:justify-center md:gap-10"
          >
            {navItems.map(([label, href]) => (
              <a
                key={href}
                className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
                href={href}
              >
                {label}
              </a>
            ))}
          </nav>

          <RulePair />

          <div className="flex min-h-14 items-center justify-center gap-4 overflow-x-auto border-b border-rule py-3 text-sm whitespace-nowrap">
            <span className="font-bold tracking-[0.08em] text-live uppercase">
              System note
            </span>
            <span className="font-semibold">Tailwind CSS v4</span>
            <span className="text-muted-foreground">OKLCH semantic tokens</span>
            <span aria-hidden="true" className="text-rule">
              /
            </span>
            <span className="font-semibold">shadcn + Base UI</span>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <section
          id="foundations"
          aria-labelledby="foundations-title"
          className="grid scroll-mt-8 border-b border-rule-strong lg:grid-cols-[0.9fr_1.7fr_0.9fr]"
        >
          <div className="py-10 pr-0 lg:py-14 lg:pr-8">
            <p className="font-sans text-[0.6875rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Tone &amp; manner
            </p>
            <h1
              id="foundations-title"
              className="mt-3 font-serif text-4xl leading-[1.08] font-black tracking-[-0.035em] text-balance sm:text-5xl"
            >
              과장 없이,
              <br />
              콘텐츠가 먼저 말하게.
            </h1>
            <p className="mt-5 max-w-md font-serif text-lg leading-7 text-muted-foreground">
              편집 디자인의 신뢰감은 큰 장식이 아니라 정확한 순서, 절제된 대비,
              반복되는 리듬에서 시작합니다.
            </p>
            <p className="mt-4 font-sans text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              4 principles · 2 type roles · 1 accent
            </p>
          </div>

          <div className="border-t border-rule py-10 lg:border-t-0 lg:border-l lg:px-10 lg:py-14">
            <p className="max-w-4xl font-serif text-4xl leading-[1.13] font-medium tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              읽는 흐름이
              <br />
              인터페이스를 결정합니다.
            </p>
            <div className="mt-10 grid gap-6 border-t border-rule pt-6 text-sm leading-6 sm:grid-cols-2">
              <p>
                <strong className="font-semibold">
                  세리프는 의미를 엽니다.
                </strong>
                <br />
                <span className="text-muted-foreground">
                  제목과 긴 문장에 사용해 편집적 위계와 읽는 속도를 만듭니다.
                </span>
              </p>
              <p>
                <strong className="font-semibold">
                  산세리프는 기능을 설명합니다.
                </strong>
                <br />
                <span className="text-muted-foreground">
                  메뉴, 상태, 버튼, 메타데이터처럼 빠르게 훑어야 하는 정보에
                  사용합니다.
                </span>
              </p>
            </div>
          </div>

          <div className="border-t border-rule py-10 lg:border-t-0 lg:border-l lg:py-14 lg:pl-8">
            <p className="font-sans text-xs font-bold tracking-[0.1em] uppercase">
              Working principles
            </p>
            <ol className="mt-4">
              {principles.map((principle) => (
                <li
                  key={principle.number}
                  className="grid grid-cols-[2rem_1fr] gap-3 border-t border-rule py-4 first:border-rule-strong"
                >
                  <span className="font-mono text-[0.6875rem] text-muted-foreground">
                    {principle.number}
                  </span>
                  <div>
                    <h3 className="font-serif text-lg leading-5 font-bold">
                      {principle.title}
                    </h3>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">
                      {principle.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="typography"
          aria-labelledby="typography-title"
          className="grid scroll-mt-8 border-b border-rule-strong py-12 lg:grid-cols-[0.85fr_2fr] lg:gap-12 lg:py-16"
        >
          <SectionHeading
            index="01 / Typography"
            title="역할이 분명한 두 서체"
            description="Noto Serif KR은 서사를, Geist는 기능을 담당합니다. 크기보다 역할을 먼저 선택합니다."
          />

          <div className="mt-10 lg:mt-0">
            <div className="grid border-t border-rule-strong sm:grid-cols-[1fr_8rem]">
              <div className="py-7 pr-5">
                <p className="font-serif text-5xl leading-[1.05] font-black tracking-[-0.04em] text-balance sm:text-6xl">
                  기록은 오래 남고,
                  <br />
                  화면은 조용히 돕습니다.
                </p>
              </div>
              <div className="border-t border-rule py-4 sm:border-t-0 sm:border-l sm:pl-5">
                <p className="font-mono text-[0.6875rem] leading-5 text-muted-foreground uppercase">
                  Display
                  <br />
                  Serif
                  <br />
                  60 / 63
                  <br />
                  900
                </p>
              </div>
            </div>

            <div className="grid border-t border-rule sm:grid-cols-[1fr_8rem]">
              <div className="max-w-3xl py-6 pr-5">
                <p className="font-serif text-2xl leading-9">
                  좋은 읽기 경험은 텍스트를 크게 만드는 데서 끝나지 않습니다.
                  제목, 요약, 본문, 메타데이터가 서로의 역할을 침범하지 않을 때
                  독자는 망설이지 않습니다.
                </p>
              </div>
              <div className="border-t border-rule py-4 sm:border-t-0 sm:border-l sm:pl-5">
                <p className="font-mono text-[0.6875rem] leading-5 text-muted-foreground uppercase">
                  Editorial
                  <br />
                  Serif
                  <br />
                  24 / 36
                  <br />
                  400
                </p>
              </div>
            </div>

            <div className="grid border-y border-rule sm:grid-cols-[1fr_8rem]">
              <div className="py-6 pr-5">
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  기능 텍스트는 빠르게 읽히고 행동을 예측할 수 있어야 합니다.
                  작은 크기에서도 충분한 대비와 여백을 유지하고, 대문자
                  메타데이터에는 제한된 자간만 사용합니다.
                </p>
                <p className="mt-5 text-[0.6875rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  Updated 2 minutes ago · 4 min read
                </p>
              </div>
              <div className="border-t border-rule py-4 sm:border-t-0 sm:border-l sm:pl-5">
                <p className="font-mono text-[0.6875rem] leading-5 text-muted-foreground uppercase">
                  Interface
                  <br />
                  Sans
                  <br />
                  16 / 28
                  <br />
                  400
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="color"
          aria-labelledby="color-title"
          className="grid scroll-mt-8 border-b border-rule-strong py-12 lg:grid-cols-[0.85fr_2fr] lg:gap-12 lg:py-16"
        >
          <SectionHeading
            index="02 / Color"
            title="이름보다 역할로 선택"
            description="모든 색은 OKLCH 값으로 정의하고, 컴포넌트에서는 색상값 대신 semantic token만 사용합니다."
          />

          <div className="mt-10 grid border-t border-l border-rule sm:grid-cols-2 lg:mt-0 xl:grid-cols-4">
            {colorTokens.map((token) => (
              <div
                key={token.name}
                className="border-r border-b border-rule p-4"
              >
                <div
                  className={cn("h-24 border border-rule", token.className)}
                />
                <p className="mt-4 font-mono text-xs font-semibold">
                  {token.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {token.role}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="components"
          aria-labelledby="components-title"
          className="scroll-mt-8 border-b border-rule-strong py-12 lg:py-16"
        >
          <div className="grid lg:grid-cols-[0.85fr_2fr] lg:gap-12">
            <SectionHeading
              index="03 / Components"
              title="절제된 기본값"
              description="shadcn의 코드 소유권과 Base UI의 접근성 primitive 위에 Chaek의 밀도, 상태, 포커스 규칙을 덮어씁니다."
            />

            <div className="mt-10 lg:mt-0">
              <div className="grid border-t border-rule-strong lg:grid-cols-[10rem_1fr]">
                <h3 className="py-5 text-xs font-bold tracking-[0.1em] uppercase">
                  Buttons
                </h3>
                <div className="flex flex-wrap items-center gap-3 border-t border-rule py-5 lg:border-t-0 lg:border-l lg:pl-6">
                  <Button>주요 행동</Button>
                  <Button variant="outline">보조 행동</Button>
                  <Button variant="secondary">중립 행동</Button>
                  <Button variant="ghost">고스트</Button>
                  <Button variant="destructive">삭제</Button>
                </div>
              </div>

              <div className="grid border-t border-rule lg:grid-cols-[10rem_1fr]">
                <h3 className="py-5 text-xs font-bold tracking-[0.1em] uppercase">
                  Status
                </h3>
                <div className="flex flex-wrap items-center gap-3 border-t border-rule py-5 lg:border-t-0 lg:border-l lg:pl-6">
                  <Badge>기본</Badge>
                  <Badge variant="secondary">초안</Badge>
                  <Badge variant="outline">검토 중</Badge>
                  <Badge variant="destructive">긴급</Badge>
                  <span className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    4 min read
                  </span>
                </div>
              </div>

              <div className="grid border-t border-rule lg:grid-cols-[10rem_1fr]">
                <h3 className="py-5 text-xs font-bold tracking-[0.1em] uppercase">
                  Form
                </h3>
                <div className="grid gap-6 border-t border-rule py-5 lg:grid-cols-[1fr_auto] lg:items-end lg:border-t-0 lg:border-l lg:pl-6">
                  <div>
                    <label
                      className="mb-2 block text-xs font-semibold"
                      htmlFor="book-title"
                    >
                      책 제목
                    </label>
                    <Input
                      id="book-title"
                      placeholder="기록의 제목을 입력하세요"
                    />
                  </div>
                  <Button>
                    계속
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </div>
              </div>

              <div className="grid border-y border-rule lg:grid-cols-[10rem_1fr]">
                <h3 className="py-5 text-xs font-bold tracking-[0.1em] uppercase">
                  Controls
                </h3>
                <div className="grid gap-5 border-t border-rule py-5 lg:grid-cols-2 lg:border-t-0 lg:border-l lg:pl-6">
                  <div className="flex items-center justify-between gap-4">
                    <span>
                      <label
                        className="block text-sm font-semibold"
                        htmlFor="editorial-notifications"
                      >
                        편집 알림
                      </label>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        중요한 변경만 알려줍니다.
                      </span>
                    </span>
                    <Switch
                      id="editorial-notifications"
                      defaultChecked
                      aria-label="편집 알림"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-rule pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    <span>
                      <span className="block text-sm font-semibold">
                        색상 테마
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        밝게, 어둡게, 시스템 설정
                      </span>
                    </span>
                    <ThemeMenu />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="patterns"
          aria-labelledby="patterns-title"
          className="scroll-mt-8 py-12 lg:py-16"
        >
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <SectionHeading
              index="04 / Editorial pattern"
              title="내용의 무게로 만드는 레이아웃"
              description="대표 콘텐츠 하나, 보조 콘텐츠 둘, 명확한 메타데이터. 비대칭은 시선을 이끌되 정보 순서를 뒤집지 않습니다."
            />
            <a
              href="#foundations"
              className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.06em] uppercase hover:text-primary"
            >
              원칙 다시 보기
              <ArrowRightIcon className="size-3.5" />
            </a>
          </div>

          <RulePair />

          <div className="mt-6 grid lg:grid-cols-[0.85fr_1.7fr_0.9fr]">
            <article className="pb-8 lg:pr-8">
              <Badge variant="outline">Foundation</Badge>
              <h3 className="mt-4 font-serif text-3xl leading-tight font-black tracking-[-0.025em]">
                한 화면에서 가장 중요한 문장은 하나입니다.
              </h3>
              <p className="mt-4 font-serif text-lg leading-7 text-muted-foreground">
                제목의 크기보다 주변 요소와의 관계가 우선순위를 만듭니다. 강조가
                경쟁하면 독자는 어디서 시작할지 결정해야 합니다.
              </p>
              <p className="mt-4 text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Principle 03 · 3 min read
              </p>
            </article>

            <article className="border-t border-rule py-8 lg:border-t-0 lg:border-l lg:px-10 lg:py-0">
              <p className="text-xs font-bold tracking-[0.1em] text-live uppercase">
                Implementation
              </p>
              <h3 className="mt-3 font-serif text-4xl leading-[1.1] font-medium tracking-[-0.035em] text-balance sm:text-5xl">
                토큰은 전역에,
                <br />
                조합은 컴포넌트 가까이에.
              </h3>
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
                색과 서체처럼 시스템 전체에서 공유하는 값은{" "}
                <code className="font-mono text-sm text-foreground">
                  @theme inline
                </code>
                에 연결합니다. 한 화면에서만 필요한 grid 비율은 해당 마크업
                가까이에 두어 문맥을 잃지 않게 합니다.
              </p>
              <ul className="mt-8 grid border-t border-rule sm:grid-cols-2">
                {[
                  "정적이고 완전한 utility class 사용",
                  "임의 색상 대신 semantic token 사용",
                  "Base UI data attribute로 상태 표현",
                  "클라이언트 경계는 상호작용에만 제한",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-b border-rule py-4 sm:odd:pr-5 sm:even:border-l sm:even:pl-5"
                  >
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm leading-5">{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <aside className="border-t border-rule py-8 lg:border-t-0 lg:border-l lg:py-0 lg:pl-8">
              <p className="text-xs font-bold tracking-[0.1em] uppercase">
                Search pattern
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                입력과 행동을 한 줄에 배치하되, 레이블과 포커스는 생략하지
                않습니다.
              </p>
              <div className="mt-6">
                <label
                  className="mb-2 block text-xs font-semibold"
                  htmlFor="pattern-search"
                >
                  디자인 시스템 검색
                </label>
                <div className="flex gap-2">
                  <Input id="pattern-search" placeholder="예: color token" />
                  <Button
                    aria-label="디자인 시스템 검색"
                    size="icon"
                    variant="outline"
                  >
                    <SearchIcon />
                  </Button>
                </div>
              </div>
              <Separator className="my-7 bg-rule" />
              <p className="font-serif text-xl leading-7 font-bold">
                “절제는 비어 있음이 아니라, 무엇을 남길지 아는 태도입니다.”
              </p>
            </aside>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule-strong">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Chaek Design System · Editorial UI foundation</p>
          <p>Tailwind CSS v4 · shadcn · Base UI · OKLCH</p>
        </div>
      </footer>
    </>
  );
}
