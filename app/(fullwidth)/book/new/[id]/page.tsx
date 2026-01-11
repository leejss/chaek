import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { findBookByIdAndUserId } from "@/lib/repositories/bookRepository";
import { findChaptersByBookIdAndStatus } from "@/lib/repositories/chapterRepository";
import type { PlanOutput } from "@/lib/ai/schemas/plan";
import { GenerationStoreProvider } from "@/context/generationContext";
import { BookGenerationSettings } from "@/context/types/settings";
import { ChapterContent } from "@/context/types/generation";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import GenerationView from "./_components/GenerationView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookGenerationPage({ params }: PageProps) {
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

  // Fetch completed chapters to populate initial state for resume
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

  // If book content is stale/empty but we have chapters, reconstruct it
  let initialContent = bookData.content || "";
  if (!initialContent && initialChapters.length > 0) {
    initialContent = initialChapters.map((c) => c.content).join("\n\n");
  }

  const settings = bookData.generationSettings as BookGenerationSettings;
  const { title, id, status, tableOfContents, sourceText, bookPlan } = bookData;

  const init = {
    chapters: initialChapters,
    bookPlan: (bookPlan as PlanOutput | null) || undefined,
  };

  return (
    <GenerationStoreProvider key={bookData.id} init={init}>
      <GenerationView
        savedBookId={id}
        bookTitle={title}
        bookStatus={status}
        tableOfContents={tableOfContents ?? []}
        sourceText={sourceText || ""}
        chapters={initialChapters}
        generationSettings={settings}
      />
    </GenerationStoreProvider>
  );
}
