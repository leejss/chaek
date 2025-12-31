import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "./_components/LogoutButton";

export const metadata: Metadata = {
  title: "book.build",
  description: "AI-assisted book creation studio",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <header className="bg-background/80 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/book"
            className="font-bold text-xl tracking-tight text-foreground hover:text-foreground/50 transition-colors"
          >
            book.build
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
