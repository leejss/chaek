import { Sidebar } from "./_components/Sidebar";
import { MobileNav } from "./_components/MobileNav";
import { MobileHeader } from "./_components/MobileHeader";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground flex-col md:flex-row">
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <Sidebar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 mb-14 md:mb-0">
        {children}
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
