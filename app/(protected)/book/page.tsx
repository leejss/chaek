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
        <h2 className="text-2xl font-bold text-white">Library</h2>
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
        <div className="flex flex-col items-center justify-center h-96 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
          <Library size={48} className="text-neutral-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No books created yet
          </h3>
          <p className="text-neutral-500 mb-6 max-w-sm">
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
              className="group bg-black border border-neutral-800 p-6 rounded-2xl hover:bg-neutral-900/50 transition-all cursor-pointer relative"
            >
              <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:underline decoration-neutral-600 underline-offset-4">
                {book.title}
              </h3>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">
                {new Date(book.createdAt).toLocaleDateString()}
              </p>
              <div className="text-neutral-400 text-sm line-clamp-3 mb-6 leading-relaxed">
                {book.content
                  ? book.content.substring(0, 150) + "..."
                  : "No content preview available."}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
