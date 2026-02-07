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
			<div className="flex flex-col items-center justify-center h-96 text-center">
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
		<div className="space-y-8">
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
				<div className="flex flex-col items-center justify-center h-96 text-center border border-dashed border-neutral-400 rounded-2xl bg-neutral-100">
					<Library size={48} className="text-neutral-600 mb-4" />
					<h3 className="text-xl font-bold text-foreground mb-2">
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
				<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
					{userBooks.map((book) => (
						<Link
							key={book.id}
							href={`/book/${book.id}`}
							className="group bg-background border border-neutral-200 px-4 py-2 rounded-md hover:bg-neutral-50 transition-all cursor-pointer relative"
						>
							<div className="flex items-center gap-2 mb-2">
								{book.status && (
									<span
										className={cn(
											"px-2 text-xs font-semibold rounded-md",
											STATUS_COLORS[book.status] || STATUS_COLORS.draft,
										)}
									>
										{STATUS_LABELS[book.status] || book.status}
									</span>
								)}
							</div>
							<h3 className="text-lg font-bold text-foreground mb-2 truncate group-hover:underline decoration-neutral-600 underline-offset-4">
								{book.title}
							</h3>
							<p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">
								{formatDate(book.createdAt)}
							</p>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
