"use client";

import { cn } from "@/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { links } from "./SidebarLinks";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-background/80 backdrop-blur-md pb-safe">
      <div className="flex items-center justify-around h-14">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/book"
              ? pathname === "/book"
              : pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full",
                isActive ? "text-foreground" : "text-neutral-500",
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
