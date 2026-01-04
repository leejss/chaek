"use client";

import { cn } from "@/utils";
import { Home, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const links = [
  { href: "/book", label: "Home", icon: Home },
  { href: "/book/new", label: "Create", icon: PlusCircle },
  // { href: "/credits", label: "Credits", icon: CreditCard },
];

export function SidebarLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-2">
      {links.map((link) => {
        const Icon = link.icon;
        // Exact match for home, startsWith for others to handle sub-routes
        const isActive =
          link.href === "/book"
            ? pathname === "/book"
            : pathname?.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-4 px-4 py-3 text-xl rounded-full transition-colors",
              isActive
                ? "font-bold text-foreground"
                : "text-foreground hover:bg-neutral-100",
            )}
          >
            <Icon className="w-7 h-7" strokeWidth={isActive ? 3 : 2} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
