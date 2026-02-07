import { desc, eq } from "drizzle-orm";
import { Library, Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import Button from "@/components/Button";
import { db } from "@/db";
import { bookGenerationStates, books } from "@/db/schema";
import { accessTokenConfig, verifyAccessJWT } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { cn, formatDate } from "@/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/utils/status";

export default async function LibraryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenConfig.name)?.value;

  if (!accessToken) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <p className="text-neutral-600">Authentication required</p>
      </div>
    );
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  const { userId } = await verifyAccessJWT(accessToken, secret);

  const dbBooks = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(eq(books.userId, userId))
    .orderBy(desc(books.createdAt));

  const userBooks = dbBooks.map((row) => ({
    id: row.book.id,
    title: row.book.title,
    content: row.book.content,
    createdAt: row.book.createdAt.toISOString(),
    tableOfContents: row.book.tableOfContents || [],
    sourceText: row.book.sourceText || undefined,
    status: row.state?.status ?? "waiting",
  }));

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-end">
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
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-neutral-400 border-dashed bg-neutral-100 text-center">
          <Library size={48} className="mb-4 text-neutral-600" />
          <h3 className="mb-2 font-bold text-foreground text-xl">No books created yet</h3>
          <p className="mb-6 max-w-sm text-neutral-500">
            Your library is empty. Start your first masterpiece by converting raw ideas into
            structured chapters.
          </p>
          <Button asChild>
            <Link href="/book/new">
              <Plus size={18} className="mr-2" />
              Create New Book
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {userBooks.map((book) => (
            <Link
              key={book.id}
              href={`/book/${book.id}`}
              className="group relative cursor-pointer rounded-md border border-neutral-200 bg-background px-4 py-2 transition-all hover:bg-neutral-50"
            >
              <div className="mb-2 flex items-center gap-2">
                {book.status && (
                  <span
                    className={cn(
                      "rounded-md px-2 font-semibold text-xs",
                      STATUS_COLORS[book.status] || STATUS_COLORS.draft,
                    )}
                  >
                    {STATUS_LABELS[book.status] || book.status}
                  </span>
                )}
              </div>
              <h3 className="mb-2 truncate font-bold text-foreground text-lg decoration-neutral-600 underline-offset-4 group-hover:underline">
                {book.title}
              </h3>
              <p className="mb-4 text-neutral-500 text-xs uppercase tracking-wider">
                {formatDate(book.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
