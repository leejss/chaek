import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { SidebarLinks } from "./SidebarLinks";

export function Sidebar() {
	return (
		<aside className="w-[275px] h-screen sticky top-0 flex flex-col border-r border-neutral-200 px-2 py-4">
			<div className="px-4 py-2 mb-4">
				<Link href="/book" className="text-3xl font-bold tracking-tight">
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
