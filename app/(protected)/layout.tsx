import { MobileNav } from "./_components/MobileNav";
import { Sidebar } from "./_components/Sidebar";

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="grid min-h-screen bg-background font-sans text-foreground grid-cols-1 md:grid-cols-[auto_1fr]">
			<Sidebar />
			<main className="w-full max-w-6xl mx-auto px-4 py-8 mb-14 md:mb-0">
				{children}
			</main>
			<div className="md:hidden">
				<MobileNav />
			</div>
		</div>
	);
}
