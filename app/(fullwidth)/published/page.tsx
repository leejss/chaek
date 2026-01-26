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
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Published</h2>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center border border-dashed border-neutral-400 rounded-2xl bg-neutral-100">
            <Library size={48} className="text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              No published books yet
            </h3>
            <p className="text-neutral-500 mb-6 max-w-sm">
              There are no published books available right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((book) => (
              <Link
                key={book.id}
                href={`/published/${book.id}`}
                className="group bg-background border border-neutral-200 p-6 rounded-2xl hover:bg-neutral-50 transition-all cursor-pointer relative"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-700">
                    Published
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 truncate group-hover:underline decoration-neutral-600 underline-offset-4">
                  {book.title}
                </h3>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">
                  {new Date(book.publishedAt).toLocaleDateString()}
                </p>
                <div className="text-neutral-600 text-sm line-clamp-3 mb-6 leading-relaxed">
                  {book.content
                    ? book.content.substring(0, 150) + "..."
                    : "No content preview available."}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
