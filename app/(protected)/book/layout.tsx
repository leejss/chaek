import type { Metadata } from "next";
import BookProvider from "@/lib/book/bookContext";
import Link from "next/link";
import { Settings } from "lucide-react";
import LogoutButton from "./_components/LogoutButton";

export const metadata: Metadata = {
  title: "BookMaker",
  description: "AI-assisted book creation studio",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookProvider>
      <div className="min-h-screen bg-paper flex flex-col font-sans text-ink-900">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/book" className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-tight text-brand-900">
                BookMaker
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <LogoutButton />
              <Link
                href="/setting"
                className="p-2 text-stone-500 hover:text-brand-900 hover:bg-brand-50 rounded-sm transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          {children}
        </main>
      </div>
    </BookProvider>
  );
}
