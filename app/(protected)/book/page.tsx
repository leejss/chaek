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
        <p className="text-neutral-600">로그인이 필요합니다</p>
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
          <Button asChild variant="ghost" className="text-neutral-600 hover:text-foreground">
            <Link href="/book/new">
              <Plus size={16} className="mr-2" />새 책 만들기
            </Link>
          </Button>
        )}
      </div>

      {userBooks.length === 0 ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50/50 text-center">
          <Library size={32} className="mb-4 text-neutral-400" strokeWidth={1.5} />
          <h3 className="mb-2 font-medium text-foreground">작성된 책이 없습니다</h3>
          <p className="mb-6 max-w-sm text-sm text-neutral-500">
            아이디어를 구조화하여 첫 번째 책을 완성해보세요.
          </p>
          <Button asChild variant="outline">
            <Link href="/book/new">
              <Plus size={16} className="mr-2" />새 책 만들기
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {userBooks.map((book) => (
            <Link
              key={book.id}
              href={`/book/${book.id}`}
              className="group flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-neutral-100/50"
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-medium text-foreground decoration-neutral-400 underline-offset-4 group-hover:underline">
                  {book.title}
                </h3>
                <p className="text-sm text-neutral-500">{formatDate(book.createdAt)}</p>
              </div>
              {book.status && (
                <span
                  className={cn(
                    "rounded-md px-2 py-1 font-medium text-xs",
                    STATUS_COLORS[book.status] || STATUS_COLORS.draft,
                  )}
                >
                  {STATUS_LABELS[book.status] || book.status}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
