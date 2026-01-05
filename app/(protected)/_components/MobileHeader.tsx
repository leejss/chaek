import Link from "next/link";
import LogoutButton from "./LogoutButton";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b border-neutral-200 bg-background/80 backdrop-blur-md">
      <Link href="/book" className="text-xl font-bold tracking-tight">
        Chaek
      </Link>
      <div className="origin-right">
        <LogoutButton iconOnly />
      </div>
    </header>
  );
}
