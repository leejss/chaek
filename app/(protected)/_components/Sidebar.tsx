import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { SidebarLinks } from "./SidebarLinks";

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[275px] flex-col border-neutral-200 border-r px-2 py-4">
      <div className="mb-4 px-4 py-2">
        <Link href="/book" className="font-bold text-3xl tracking-tight">
          Chaek
        </Link>
      </div>
      <div className="flex-1">
        <SidebarLinks />
      </div>
      <div className="p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
