import { cookies } from "next/headers";
import Link from "next/link";
import { Library, Plus, ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { books } from "@/db/schema";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { eq, desc } from "drizzle-orm";
import Button from "./_components/Button";

export default async function LibraryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenConfig.name)?.value;

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-stone-500">Authentication required</p>
      </div>
    );
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  const { userId } = await verifyAccessJWT(accessToken, secret);

  const dbBooks = await db
    .select()
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(desc(books.createdAt));

  const userBooks = dbBooks.map((book) => ({
    id: book.id,
    title: book.title,
    content: book.content,
    createdAt: book.createdAt.toISOString(),
    tableOfContents: book.tableOfContents || [],
    sourceText: book.sourceText || undefined,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        {userBooks.length > 0 && (
          <Button asChild>
            <Link href="/book/new">
              <Plus size={18} className="mr-2" />
              Create New Book
            </Link>
          </Button>
        )}
      </div>

      {userBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50">
          <Library size={48} className="text-stone-300 mb-4" />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            No books created yet
          </h3>
          <p className="text-stone-500 mb-6 max-w-sm">
            Your library is empty. Start your first masterpiece by converting
            raw ideas into structured chapters.
          </p>
          <Button asChild>
            <Link href="/book/new">
              <Plus size={18} className="mr-2" />
              Create New Book
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userBooks.map((book) => (
            <Link
              key={book.id}
              href={`/book/${book.id}`}
              className="group bg-white border border-stone-200 p-6 rounded-sm shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-brand-600 relative"
            >
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-2 truncate">
                {book.title}
              </h3>
              <p className="text-xs text-stone-400 uppercase tracking-wider mb-4">
                {new Date(book.createdAt).toLocaleDateString()}
              </p>
              <div className="text-stone-600 text-sm line-clamp-3 mb-6 font-serif leading-relaxed">
                {book.content
                  ? book.content.substring(0, 150) + "..."
                  : "No content preview available."}
              </div>
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-stone-100">
                <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded">
                  Completed
                </span>
                <span className="text-stone-400 group-hover:text-brand-900 transition-colors">
                  <ChevronLeft className="rotate-180" size={20} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
