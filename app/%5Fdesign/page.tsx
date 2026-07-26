import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Design System | Chaek",
  description:
    "Framer의 UI primitive와 고요한 자연의 감각을 참고한 Chaek 디자인 시스템",
};

const principles = [
  {
    number: "01",
    title: "Canvas before chrome",
    description:
      "도구보다 사용자가 만들고 읽는 콘텐츠를 먼저 보여주고, chrome은 작업을 조용히 보조합니다.",
  },
  {
    number: "02",
    title: "Silence has structure",
    description:
      "mist paper와 forest-black 사이의 여백을 능동적인 구조로 사용하고, Deep Forest는 핵심 행동에만 남깁니다.",
  },
  {
    number: "03",
    title: "Nature, precisely framed",
    description:
      "자연에서 가져온 낮은 채도의 깊이와 디지털 control의 정밀한 경계를 함께 사용합니다.",
  },
  {
    number: "04",
    title: "One sustained tone",
    description:
      "Deep Forest를 넓게 장식하지 않고 primary action, focus, active state에 일관되게 반복합니다.",
  },
] as const;

const colorTokens = [
  {
    name: "background",
    role: "Mist / forest canvas",
    className: "bg-background",
  },
  {
    name: "foreground",
    role: "Charcoal / paper text",
    className: "bg-foreground",
  },
  {
    name: "card",
    role: "독립 panel",
    className: "bg-card",
  },
  {
    name: "muted",
    role: "보조 surface",
    className: "bg-muted",
  },
  {
    name: "primary",
    role: "Deep Forest action",
    className: "bg-primary",
  },
  {
    name: "accent",
    role: "Moss selection",
    className: "bg-accent",
  },
  {
    name: "live",
    role: "Mineral signal",
    className: "bg-live",
  },
  {
    name: "destructive",
    role: "위험 행동",
    className: "bg-destructive",
  },
] as const;

const navItems = [
  ["원칙", "#foundations"],
  ["타입", "#typography"],
  ["컬러", "#color"],
  ["컴포넌트", "#components"],
  ["패턴", "#patterns"],
] as const;

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs font-medium text-primary">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 text-3xl leading-tight font-medium tracking-[-0.035em] text-balance sm:text-5xl"
      >
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 place-items-center rounded-md bg-foreground text-background"
    >
      <BookOpenIcon className="size-4" strokeWidth={2} />
    </span>
  );
}

function WorkspacePreview() {
  const steps = [
    ["Outline", "완료"],
    ["Draft", "작업 중"],
    ["Review", "대기"],
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-panel">
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-muted px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-live" />
          <span className="text-sm font-medium">Chaek workspace</span>
          <Badge className="hidden sm:inline-flex" variant="secondary">
            Autosaved
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button className="hidden sm:inline-flex" size="sm" variant="ghost">
            미리보기
          </Button>
          <Button size="sm">공개하기</Button>
        </div>
      </div>

      <div className="mt-2 grid overflow-hidden rounded-xl border border-border bg-background lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-border bg-muted/60 p-4 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">진행 단계</p>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              2 / 3
            </span>
          </div>
          <ol className="mt-4 space-y-1">
            {steps.map(([label, status], index) => (
              <li
                key={label}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                  index === 1
                    ? "bg-card font-medium text-foreground shadow-control"
                    : "text-muted-foreground",
                )}
              >
                <span>{label}</span>
                <span className="text-xs">{status}</span>
              </li>
            ))}
          </ol>
        </aside>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              <Badge variant="outline">Chapter 02</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                1,248 words
              </span>
            </div>
            <h3 className="mt-8 text-3xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
              생각을 놓치지 않고
              <br />
              한 권의 흐름으로.
            </h3>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              작업 공간은 콘텐츠가 가장 높은 대비를 갖도록 두고, control과
              metadata는 필요할 때 빠르게 찾을 수 있는 밀도로 정리합니다.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["24", "메모"],
                ["08", "장면"],
                ["03", "남은 검토"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-2xl font-medium tracking-[-0.03em]">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignCatalog() {
  return (
    <>
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-16 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-popover transition-transform focus:translate-y-0"
      >
        본문으로 건너뛰기
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
          <a
            href="#main-content"
            className="flex items-center gap-2.5"
            aria-label="Chaek 디자인 시스템 홈"
          >
            <BrandMark />
            <span className="text-sm font-semibold tracking-[-0.01em]">
              Chaek
            </span>
          </a>

          <nav
            aria-label="디자인 시스템 주요 메뉴"
            className="hidden items-center gap-5 md:flex"
          >
            {navItems.map(([label, href]) => (
              <a
                key={href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                href={href}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeMenu />
            <a
              href="#components"
              className={cn(
                buttonVariants({ size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              UI 보기
            </a>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section
          id="foundations"
          aria-labelledby="foundations-title"
          className="scroll-mt-24 px-5 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-24"
        >
          <div className="mx-auto max-w-7xl">
            <Badge variant="outline">Framer primitives · Silence & nature</Badge>
            <h1
              id="foundations-title"
              className="mt-6 max-w-5xl text-5xl leading-[0.98] font-medium tracking-[-0.055em] text-balance sm:text-7xl lg:text-[5.75rem]"
            >
              작업은 선명하게,
              <br />
              인터페이스는 조용하게.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Framer의 제품형 시각 언어 위에 정적, 절제, 자연과 기술의 긴장을
              더했습니다. Deep Forest는 행동을 선명하게 하고, 넓은 여백은
              콘텐츠가 머무를 시간을 만듭니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#components"
                className={buttonVariants({ size: "lg" })}
              >
                컴포넌트 보기
                <ArrowRightIcon data-icon="inline-end" />
              </a>
              <a
                href="#patterns"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                패턴 보기
              </a>
            </div>

            <div className="mt-16 sm:mt-24">
              <WorkspacePreview />
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:mt-24 lg:grid-cols-4">
              {principles.map((principle) => (
                <article
                  key={principle.number}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {principle.number}
                  </span>
                  <h2 className="mt-8 text-lg font-medium tracking-[-0.02em]">
                    {principle.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="typography"
          aria-labelledby="typography-title"
          className="scroll-mt-24 border-t border-border bg-card px-5 py-16 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              id="typography-title"
              eyebrow="01 / Typography"
              title="하나의 산세리프로 만드는 분명한 역할"
              description="Geist를 display와 interface에 함께 사용하고, 크기·굵기·행간으로 메시지와 기능의 차이를 만듭니다."
            />

            <div className="mt-12 grid gap-4 lg:grid-cols-[1.6fr_0.8fr]">
              <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <Badge variant="secondary">Display</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    64 / 64 · 500
                  </span>
                </div>
                <p className="mt-16 text-5xl leading-none font-medium tracking-[-0.055em] text-balance sm:text-7xl">
                  생각에서
                  <br />
                  한 권까지.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="flex items-center justify-between gap-4">
                    <Badge variant="secondary">Interface</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      16 / 26 · 400
                    </span>
                  </div>
                  <p className="mt-12 text-base leading-7">
                    기능 텍스트는 빠르게 읽히고, 다음 행동과 현재 상태를 동시에
                    설명해야 합니다.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="flex items-center justify-between gap-4">
                    <Badge variant="secondary">Technical</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      12 / 18 · 400
                    </span>
                  </div>
                  <p className="mt-12 font-mono text-sm text-muted-foreground">
                    draft_02 · autosaved · 1,248 words
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="color"
          aria-labelledby="color-title"
          className="scroll-mt-24 border-t border-border px-5 py-16 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <SectionHeading
                id="color-title"
                eyebrow="02 / Color"
                title="Mist paper, Deep Forest"
                description="Light는 안개 낀 paper, dark는 forest-black을 사용합니다. Deep Forest는 브랜드와 핵심 행동, mineral blue와 rust red는 상태의 의미에만 사용합니다."
              />
              <p className="font-mono text-xs text-muted-foreground">
                OKLCH · light / dark / system
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {colorTokens.map((token) => (
                <article
                  key={token.name}
                  className="rounded-xl border border-border bg-card p-2 shadow-control"
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "h-28 rounded-lg border border-border",
                      token.className,
                    )}
                  />
                  <div className="px-2 pt-4 pb-3">
                    <p className="font-mono text-xs font-medium">{token.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {token.role}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="components"
          aria-labelledby="components-title"
          className="scroll-mt-24 border-t border-border bg-card px-5 py-16 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              id="components-title"
              eyebrow="03 / Components"
              title="작고 직접적인 UI primitives"
              description="8px 안팎의 radius, 얇은 border, 낮은 shadow를 기본으로 사용하고 Base UI의 state attribute로 상호작용을 표현합니다."
            />

            <div className="mt-12 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">Button</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Primary action은 한 그룹에 하나만 둡니다.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    32–44px
                  </span>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Button>공개하기</Button>
                  <Button variant="outline">미리보기</Button>
                  <Button variant="secondary">초안 저장</Button>
                  <Button variant="ghost">취소</Button>
                  <Button variant="destructive">삭제</Button>
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">Status</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      색과 텍스트를 함께 사용해 의미를 고정합니다.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    compact
                  </span>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Badge>선택됨</Badge>
                  <Badge variant="secondary">초안</Badge>
                  <Badge variant="outline">검토 중</Badge>
                  <Badge variant="success">공개됨</Badge>
                  <Badge variant="destructive">오류</Badge>
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">Input</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Label, input, action의 관계를 가깝게 유지합니다.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    focus ring
                  </span>
                </div>
                <div className="mt-8">
                  <label
                    className="mb-2 block text-sm font-medium"
                    htmlFor="book-title"
                  >
                    책 제목
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="book-title"
                      placeholder="기록의 제목을 입력하세요"
                    />
                    <Button>
                      계속
                      <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">Controls</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      설정값과 결과가 같은 문맥 안에서 보이게 합니다.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    checked / open
                  </span>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                    <span>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="autosave"
                      >
                        자동 저장
                      </label>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        변경 사항을 즉시 저장합니다.
                      </span>
                    </span>
                    <Switch
                      id="autosave"
                      defaultChecked
                      aria-label="자동 저장"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                    <span>
                      <span className="block text-sm font-medium">
                        화면 테마
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Light, dark, system
                      </span>
                    </span>
                    <ThemeMenu />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="patterns"
          aria-labelledby="patterns-title"
          className="scroll-mt-24 border-t border-border px-5 py-16 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              id="patterns-title"
              eyebrow="04 / Product pattern"
              title="Surface 안에서 이어지는 상태와 행동"
              description="목록, 선택, 세부 정보, primary action을 하나의 작업 흐름으로 연결하고 각 단계의 상태를 바로 확인할 수 있게 합니다."
            />

            <div className="mt-12 rounded-2xl border border-border bg-card p-2 shadow-panel">
              <div className="flex flex-col gap-3 rounded-xl bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <BrandMark />
                  <div>
                    <p className="text-sm font-medium">내 책</p>
                    <p className="text-xs text-muted-foreground">
                      최근 작업 3개
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1 sm:w-56">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      aria-label="책 검색"
                      className="pl-9"
                      placeholder="책 검색"
                    />
                  </div>
                  <Button>새 책</Button>
                </div>
              </div>

              <div className="mt-2 overflow-hidden rounded-xl border border-border">
                {[
                  ["마음을 정리하는 작은 문장들", "공개됨", "오늘 14:32"],
                  ["도시를 걷는 방법", "검토 중", "어제 21:08"],
                  ["다음 계절의 기록", "초안", "7월 24일"],
                ].map(([title, status, time], index) => (
                  <div
                    key={title}
                    className="flex flex-col gap-4 border-b border-border bg-background p-4 last:border-b-0 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <BookOpenIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <Badge
                        variant={
                          index === 0
                            ? "success"
                            : index === 1
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {status}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        열기
                        <ArrowRightIcon data-icon="inline-end" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  "선택은 accent surface로",
                  "완료 상태는 text와 color로",
                  "주요 행동은 한 위치에",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl bg-muted p-4"
                  >
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm leading-5">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-16" />

            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-2xl leading-tight font-medium tracking-[-0.03em] sm:text-3xl">
                  레퍼런스는 결과물이 아니라
                  <br />
                  판단 기준으로 사용합니다.
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Framer의 화면이나 특정 작품의 시각물을 복제하지 않습니다.
                  Chaek에 필요한 primitive와 정적, 절제, 자연과 기술의 관계만
                  디자인 원칙으로 번역합니다.
                </p>
              </div>
              <a
                href="#foundations"
                className={buttonVariants({ variant: "outline" })}
              >
                원칙 다시 보기
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Chaek Design System · Product UI foundation</p>
          <p>Framer primitives · Silence / nature / technology · OKLCH</p>
        </div>
      </footer>
    </>
  );
}
