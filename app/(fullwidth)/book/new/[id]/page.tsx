import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import type { ChapterContent } from "@/context/types/generation";
import { getBookWithValidation } from "@/lib/actions/book";
import { accessTokenConfig, verifyAccessJWT } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { findChaptersByBookIdAndStatus } from "@/lib/repositories/chapterRepository";
import GenerationView from "./_components/GenerationView";
import BookGenerationLoading from "./loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookGenerationPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BookGenerationLoading />}>
      <BookGenerationContent params={params} />
    </Suspense>
  );
}

async function BookGenerationContent({ params }: PageProps) {
  const { id: bookId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenConfig.name)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  const { userId } = await verifyAccessJWT(accessToken, secret);

  const bookData = await getBookWithValidation(bookId, userId);

  if (!bookData) {
    notFound();
  }

  if (bookData.status === "completed") {
    redirect(`/book/${bookId}`);
  }

  const completedChapters = await findChaptersByBookIdAndStatus(bookId, "completed");

  const initialChapters: ChapterContent[] = completedChapters.map((c) => ({
    chapterNumber: c.chapterNumber,
    chapterTitle: c.title,
    content: c.content,
    isComplete: true,
  }));

  const { title, id, status, tableOfContents } = bookData;

  return (
    <div className="min-h-full w-full">
      <GenerationView
        bookId={id}
        bookTitle={title}
        bookStatus={status}
        tableOfContents={tableOfContents ?? []}
        chapters={initialChapters}
      />
    </div>
  );
}
