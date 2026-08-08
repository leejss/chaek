"use client";

import Image from "next/image";
import Link from "next/link";

import chaekIcon from "@/app/icon.png";
import { AccountMenu } from "@/components/account-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({
  user,
}: {
  user: { email: string; name: string } | null;
}) {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex w-full max-w-page items-center p-4">
        <div
          className={cn(
            "flex h-full items-center gap-2",
            user
              ? "lg:w-60 lg:shrink-0 lg:border-r lg:border-border"
              : "flex-1",
          )}
        >
          <Link
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/20"
            href="/"
          >
            <Image alt="" className="size-7 rounded-md" src={chaekIcon} />
            <span className="text-sm font-semibold tracking-tight">Chaek</span>
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "ml-auto",
              )}
              href="/sign-in"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
