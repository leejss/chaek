"use client";

import Image from "next/image";
import Link from "next/link";
import { PanelLeftOpenIcon } from "lucide-react";

import chaekIcon from "@/app/icon.png";
import { AccountMenu } from "@/components/account-menu";
import { useMobileNavigation } from "@/components/mobile-navigation";
import { ThemeMenu } from "@/components/theme-menu";

export function SiteHeader({
  hasContentNavigation = false,
  user,
}: {
  hasContentNavigation?: boolean;
  user: { email: string; name: string } | null;
}) {
  const { isOpen, setIsOpen, triggerRef } = useMobileNavigation();

  return (
    <header className="sticky top-0 z-[60] flex h-14 w-full items-center justify-between border-b border-border/70 bg-background/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-8">
      <div className="flex items-center gap-2">
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
          href="/content"
        >
          <Image alt="" className="size-7 rounded-md" src={chaekIcon} />
          <span className="text-sm font-semibold tracking-[-0.02em]">
            Chaek
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeMenu />
        {user ? <AccountMenu user={user} /> : null}
      </div>
    </header>
  );
}
