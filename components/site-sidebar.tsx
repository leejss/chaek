"use client";

import { Dialog } from "@base-ui/react/dialog";
import { PanelLeftCloseIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useMobileNavigation } from "@/components/mobile-navigation";
import type {
  ContentProjectNavigationItem,
  ContentProjectNavigationSection,
} from "@/lib/content/services/projects";
import { cn } from "@/lib/utils";

const sectionLabels: Record<ContentProjectNavigationSection, string> = {
  older: "지난 작업",
  today: "오늘",
  week: "이번 주",
};

const sectionOrder: ContentProjectNavigationSection[] = [
  "today",
  "week",
  "older",
];

function getStatusMeta(
  status: ContentProjectNavigationItem["status"],
  buildStatus: ContentProjectNavigationItem["buildStatus"],
) {
  if (
    buildStatus === "queued" ||
    buildStatus === "running" ||
    buildStatus === "waiting_for_user" ||
    buildStatus === "partially_completed"
  ) {
    return {
      label: "작성 중",
      className: "text-primary",
    };
  }

  switch (status) {
    case "planning":
      return {
        label: "초안",
        className: "text-muted-foreground",
      };
    case "drafting":
    case "review":
      return {
        label: "작성 중",
        className: "text-primary",
      };
    case "published":
    case "ready":
      return {
        label: "완료",
        className: "text-live",
      };
  }
}

function getProjectHref(project: ContentProjectNavigationItem) {
  const params = new URLSearchParams({ projectId: project.id });

  if (project.buildId) {
    params.set("buildId", project.buildId);
  }

  return `/content?${params.toString()}`;
}

function ProjectLink({
  onNavigate,
  project,
  selected,
  showStatusBelow = false,
}: {
  onNavigate: () => void;
  project: ContentProjectNavigationItem;
  selected: boolean;
  showStatusBelow?: boolean;
}) {
  const status = getStatusMeta(project.status, project.buildStatus);

  return (
    <Link
      aria-current={selected ? "page" : undefined}
      className={cn(
        "flex min-h-11 gap-3 rounded-md px-3 py-2.5 text-sm outline-none transition-[background-color,color] duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/20",
        showStatusBelow ? "items-start" : "items-center",
        selected
          ? "bg-accent text-accent-foreground"
          : "text-foreground",
      )}
      href={getProjectHref(project)}
      onClick={onNavigate}
      title={project.title}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{project.title}</span>
        {showStatusBelow ? (
          <span className={cn("mt-0.5 block text-xs", status.className)}>
            {status.label}
          </span>
        ) : null}
      </span>
      {showStatusBelow ? null : (
        <span className={cn("shrink-0 text-xs", status.className)}>
          {status.label}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  idPrefix,
  isMobile = false,
  onNavigate,
  projects,
}: {
  idPrefix: string;
  isMobile?: boolean;
  onNavigate: () => void;
  projects: ContentProjectNavigationItem[];
}) {
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("projectId");

  const projectsBySection = sectionOrder.map((section) => ({
    items: projects.filter((project) => project.section === section),
    section,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
      {isMobile ? (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-[-0.02em]">
            내 콘텐츠
          </span>
          <Dialog.Close
            aria-label="콘텐츠 목록 닫기"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/20"
          >
            <PanelLeftCloseIcon aria-hidden="true" className="size-4" />
          </Dialog.Close>
        </div>
      ) : null}

      <Link
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-control outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/20"
        href="/content"
        onClick={onNavigate}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        새 콘텐츠
      </Link>

      {isMobile ? null : (
        <h2 className="mt-8 text-sm font-semibold tracking-[-0.02em]">
          내 콘텐츠
        </h2>
      )}

      <nav
        aria-label="생성한 콘텐츠"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          isMobile ? "mt-6" : "mt-5",
        )}
      >
        {projects.length ? (
          <div className="space-y-7">
            {projectsBySection.map(({ items, section }) =>
              items.length ? (
                <section
                  key={section}
                  aria-labelledby={`${idPrefix}-${section}`}
                >
                  <h3
                    className="px-3 text-xs font-medium text-muted-foreground"
                    id={`${idPrefix}-${section}`}
                  >
                    {sectionLabels[section]}
                  </h3>
                  <div className="mt-2 space-y-0.5">
                    {items.map((project) => (
                      <ProjectLink
                        key={project.id}
                        onNavigate={onNavigate}
                        project={project}
                        selected={project.id === activeProjectId}
                        showStatusBelow={isMobile}
                      />
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        ) : (
          <p className="px-3 text-sm leading-6 text-muted-foreground">
            아직 만든 콘텐츠가 없습니다.
          </p>
        )}
      </nav>
    </div>
  );
}

export function SiteSidebar({
  projects,
}: {
  projects: ContentProjectNavigationItem[];
}) {
  const { isOpen, setIsOpen, triggerRef } = useMobileNavigation();

  return (
    <>
      <aside
        aria-label="내 콘텐츠"
        className="fixed top-14 bottom-0 left-0 z-50 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
      >
        <SidebarContent
          idPrefix="desktop-content"
          onNavigate={() => undefined}
          projects={projects}
        />
      </aside>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 top-14 z-40 bg-foreground/15 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 lg:hidden" />
          <Dialog.Popup
            aria-label="내 콘텐츠"
            className="fixed top-14 bottom-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-panel outline-none transition-[transform,opacity] duration-200 ease-out data-starting-style:-translate-x-3 data-starting-style:opacity-0 data-ending-style:-translate-x-3 data-ending-style:opacity-0 lg:hidden"
            finalFocus={triggerRef}
            id="mobile-content-navigation"
          >
            <SidebarContent
              idPrefix="mobile-content"
              isMobile
              onNavigate={() => setIsOpen(false)}
              projects={projects}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function SiteSidebarFallback() {
  return (
    <aside
      aria-hidden="true"
      className="fixed top-14 bottom-0 left-0 z-50 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block"
    />
  );
}
