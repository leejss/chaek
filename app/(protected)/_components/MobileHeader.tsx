import Link from "next/link";
import LogoutButton from "./LogoutButton";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-neutral-200 border-b bg-background/80 px-4 backdrop-blur-md">
      <Link href="/book" className="font-bold text-xl tracking-tight">
        Chaek
      </Link>
      <div className="origin-right">
        <LogoutButton iconOnly />
      </div>
    </header>
  );
}
