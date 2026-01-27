import { db } from "@/db";
import { publishedBooks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Library } from "lucide-react";
import Link from "next/link";

export default async function PublishedPage() {
  const items = await db
    .select()
    .from(publishedBooks)
    .orderBy(desc(publishedBooks.publishedAt));

  return (
    <div className="min-h-screen bg-background font-sans text-ink-900 selection:bg-brand-600 selection:text-white flex flex-col">
      {/* Navigation / Header */}
      <header className="border-b border-neutral-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity"
          >
            Chaek
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-bold hover:text-brand-600 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/book/new"
              className="bg-ink-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-black transition-all"
            >
              Create
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-4 md:py-6 flex-1 w-full">
        {/* Hero Section */}
        <div className="max-w-3xl space-y-6 mb-4">
          <h1 className="text-xl md:text-3xl font-black tracking-tighter leading-[0.9]">
            Published <span className="text-brand-600">Ideas.</span>
          </h1>
          <p className="text-ink-400 font-medium md:text-lg">
            Explore a digital library of books synthesized by AI, curated by
            humans, and shared with the world.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="py-32 border-t border-ink-900 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center">
              <Library size={32} className="text-neutral-300" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              Nothing here yet
            </h3>
            <p className="text-ink-400 max-w-xs font-medium">
              We&apos;re waiting for the first masterpiece to be published.
            </p>
          </div>
        ) : (
          <div className="border-t last:border-0 border-ink-900 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
              {items.map((book) => (
                <Link
                  key={book.id}
                  href={`/published/${book.id}`}
                  className="group space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-600">
                      {new Date(book.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="h-px flex-1 bg-neutral-100 ml-4" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-serif font-bold leading-tight tracking-tight group-hover:text-brand-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-[13px] md:text-sm text-ink-800 font-serif line-clamp-3 leading-relaxed opacity-80">
                    {book.content.replace(/[#*`]/g, "").slice(0, 200)}...
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl w-full mx-auto px-6 py-20 border-t border-neutral-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <span className="text-4xl font-black tracking-tighter">Chaek.</span>
          <p className="text-sm font-bold text-neutral-400">
            © {new Date().getFullYear()} Chaek Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
