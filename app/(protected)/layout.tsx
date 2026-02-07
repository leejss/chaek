import { MobileNav } from "./_components/MobileNav";
import { Sidebar } from "./_components/Sidebar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background font-sans text-foreground md:grid-cols-[auto_1fr]">
      <Sidebar />
      <main>{children}</main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
