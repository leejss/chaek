import { desc } from "drizzle-orm";
import { Library } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { publishedBooks } from "@/db/schema";
import { getUserId } from "@/lib/auth";

export default async function PublishedPage() {
  const items = await db.select().from(publishedBooks).orderBy(desc(publishedBooks.publishedAt));

  let isAuthenticated = false;
  try {
    await getUserId();
    isAuthenticated = true;
  } catch {
    isAuthenticated = false;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-ink-900 selection:bg-brand-600 selection:text-white">
      {/* Navigation / Header */}
      <header className="sticky top-0 z-50 border-neutral-100 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="font-black text-2xl tracking-tighter transition-opacity hover:opacity-80"
          >
            Chaek
          </Link>
          <div className="flex items-center gap-6">
            {!isAuthenticated && (
              <Link
                href="/login"
                className="font-bold text-sm transition-colors hover:text-brand-600"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/book/new"
              className="rounded-full bg-ink-900 px-5 py-2 font-bold text-sm text-white transition-all hover:bg-black"
            >
              Create
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-4 md:py-6">
        {/* Hero Section */}
        <div className="mb-4 max-w-3xl space-y-6">
          <h1 className="font-black text-xl leading-[0.9] tracking-tighter md:text-3xl">
            Published <span className="text-brand-600">Ideas.</span>
          </h1>
          <p className="font-medium text-ink-400 md:text-lg">
            Explore a digital library of books synthesized by AI, curated by humans, and shared with
            the world.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 border-ink-900 border-t py-32 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-50">
              <Library size={32} className="text-neutral-300" />
            </div>
            <h3 className="font-black text-2xl tracking-tight">Nothing here yet</h3>
            <p className="max-w-xs font-medium text-ink-400">
              We&apos;re waiting for the first masterpiece to be published.
            </p>
          </div>
        ) : (
          <div className="border-ink-900 border-t pt-6 last:border-0">
            <div className="grid grid-cols-1 gap-x-16 gap-y-16 md:grid-cols-2">
              {items.map((book) => (
                <Link key={book.id} href={`/published/${book.id}`} className="group space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-600 text-sm">
                      {new Date(book.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="ml-4 h-px flex-1 bg-neutral-100" />
                  </div>
                  <h3 className="font-bold font-serif text-xl leading-tight tracking-tight transition-colors group-hover:text-brand-600 md:text-2xl">
                    {book.title}
                  </h3>
                  <p className="line-clamp-3 font-serif text-[13px] text-ink-800 leading-relaxed opacity-80 md:text-sm">
                    {book.content.replace(/[#*`]/g, "").slice(0, 200)}...
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-7xl border-neutral-100 border-t px-6 py-20">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <span className="font-black text-4xl tracking-tighter">Chaek.</span>
          <p className="font-bold text-neutral-400 text-sm">
            © {new Date().getFullYear()} Chaek Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
