"use client";

import { ChevronDownIcon, LogOutIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AccountMenuUser = {
  email: string;
  name: string;
};

export function AccountMenu({ user }: { user: AccountMenuUser }) {
  const initial = user.name.trim().slice(0, 1).toLocaleUpperCase() || "C";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${user.name} 계정 메뉴`}
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "max-w-48 px-2",
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[0.6875rem] font-semibold text-accent-foreground"
        >
          {initial}
        </span>
        <span className="hidden truncate sm:inline">{user.name}</span>
        <ChevronDownIcon aria-hidden="true" className="hidden sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="normal-case tracking-normal">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action="/api/auth/logout" method="post">
          <DropdownMenuItem
            nativeButton
            render={<button className="w-full" type="submit" />}
          >
            <LogOutIcon aria-hidden="true" />
            로그아웃
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
