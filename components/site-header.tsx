"use client";

import { BookOpenIcon, PanelLeftOpenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import chaekIcon from "@/app/icon.png";
import { AccountMenu } from "@/components/account-menu";
import { useMobileNavigation } from "@/components/mobile-navigation";
import { ThemeMenu } from "@/components/theme-menu";
import type { ContentProjectNavigationItem } from "@/lib/content/services/projects";
import { cn } from "@/lib/utils";

function ActiveWorkspaceTitle({
  projects,
}: {
  projects: ContentProjectNavigationItem[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname !== "/content") {
    return null;
  }

  const activeProjectId = searchParams.get("projectId");
  const activeProject = projects.find(
    (project) => project.id === activeProjectId,
  );

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <BookOpenIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="truncate font-medium tracking-tight">
        {activeProject?.title ?? "새 콘텐츠"}
      </span>
    </div>
  );
}

export function SiteHeader({
  hasContentNavigation = false,
  projects = [],
  user,
}: {
  hasContentNavigation?: boolean;
  projects?: ContentProjectNavigationItem[];
  user: { email: string; name: string } | null;
}) {
  const { isOpen, setIsOpen, triggerRef } = useMobileNavigation();

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border/70 bg-background/95 backdrop-blur">
      <div
        className={cn(
          "flex h-full items-center gap-2 px-5 sm:px-6",
          user ? "lg:w-60 lg:shrink-0 lg:border-r lg:border-border" : "flex-1",
        )}
      >
        {hasContentNavigation ? (
          <button
            aria-controls="mobile-content-navigation"
            aria-expanded={isOpen}
            aria-label="콘텐츠 목록 열기"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/20 lg:hidden"
            onClick={() => setIsOpen(true)}
            ref={triggerRef}
            type="button"
          >
            <PanelLeftOpenIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}

        <Link
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/20"
          href="/"
        >
          <Image alt="" className="size-7 rounded-md" src={chaekIcon} />
          <span className="text-sm font-semibold tracking-tight">
            Chaek
          </span>
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 sm:px-6">
        <Suspense fallback={null}>
          <ActiveWorkspaceTitle projects={projects} />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <ThemeMenu />
          {user ? <AccountMenu user={user} /> : null}
        </div>
      </div>
    </header>
  );
}
