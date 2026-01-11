import { ChapterContent } from "@/context/types/generation";
import { BookGenerationSettings } from "@/context/types/settings";
import type { PlanOutput } from "@/lib/ai/schemas/plan";
import { accessTokenConfig, verifyAccessJWT } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { findBookByIdAndUserId } from "@/lib/repositories/bookRepository";
import { findChaptersByBookIdAndStatus } from "@/lib/repositories/chapterRepository";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
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

  const bookData = await findBookByIdAndUserId(bookId, userId);

  if (!bookData) {
    notFound();
  }

  if (bookData.status === "completed") {
    redirect(`/book/${bookId}`);
  }

  const completedChapters = await findChaptersByBookIdAndStatus(
    bookId,
    "completed",
  );

  const initialChapters: ChapterContent[] = completedChapters.map((c) => ({
    chapterNumber: c.chapterNumber,
    chapterTitle: c.title,
    content: c.content,
    isComplete: true,
  }));

  let initialContent = bookData.content || "";
  if (!initialContent && initialChapters.length > 0) {
    initialContent = initialChapters.map((c) => c.content).join("\n\n");
  }

  const { title, id, status, tableOfContents, sourceText, bookPlan } = bookData;

  return (
    <GenerationView
      bookId={id}
      bookTitle={title}
      bookStatus={status}
      tableOfContents={tableOfContents ?? []}
      sourceText={sourceText || ''}
      chapters={initialChapters}
      generationSettings={
        bookData.generationSettings as BookGenerationSettings
      }
      bookPlan={(bookPlan as PlanOutput | null) || undefined}
    />
  );
}
