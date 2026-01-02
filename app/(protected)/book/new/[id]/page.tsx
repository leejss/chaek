import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/ai/config";
import type { PlanOutput } from "@/lib/ai/specs/plan";
import { GenerationStoreProvider } from "@/lib/book/generationContext";
import { BookGenerationSettings } from "@/lib/book/settings";
import {
  AIProvider,
  ChapterContent,
  ClaudeModel,
  GeminiModel,
} from "@/lib/book/types";
import { and, eq, asc } from "drizzle-orm";
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

  const foundBooks = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (foundBooks.length === 0) {
    notFound();
  }

  const bookData = foundBooks[0];

  if (bookData.status === "completed") {
    redirect(`/book/${bookId}`);
  }

  // Fetch completed chapters to populate initial state for resume
  const completedChapters = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.bookId, bookId), eq(chapters.status, "completed")))
    .orderBy(asc(chapters.chapterNumber));

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

  const rawSettings = bookData.generationSettings as
    | Partial<BookGenerationSettings>
    | null
    | undefined;

  const generationSettings: Partial<BookGenerationSettings> = {
    language: rawSettings?.language,
    chapterCount: rawSettings?.chapterCount,
    userPreference: rawSettings?.userPreference,
    provider: (rawSettings?.provider ?? DEFAULT_PROVIDER) as AIProvider,
    model: (rawSettings?.model ?? DEFAULT_MODEL) as GeminiModel | ClaudeModel,
  };

  const init = {
    bookId: bookData.id,
    title: bookData.title,
    bookStatus:
      (bookData.status as "draft" | "generating" | "completed" | "failed") ||
      "draft",
    content: initialContent,
    tableOfContents: bookData.tableOfContents || [],
    chapters: initialChapters,
    sourceText: bookData.sourceText || undefined,
    generationSettings,
    bookPlan: (bookData.bookPlan as PlanOutput | null) || undefined,
  };

  return (
    <GenerationStoreProvider key={bookData.id} init={init}>
      <GenerationView />
    </GenerationStoreProvider>
  );
}
