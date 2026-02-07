"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { links } from "./SidebarLinks";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-neutral-200 border-t bg-background/80 pb-safe backdrop-blur-md">
      <div className="flex h-14 items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/book" ? pathname === "/book" : pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center",
                isActive ? "text-foreground" : "text-neutral-500",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
