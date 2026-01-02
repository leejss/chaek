import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { ai } from "@/lib/ai/core/ai";
import { PlanOutput } from "@/lib/ai/specs/plan";
import { SSEEvent, ResumeConfig } from "@/lib/ai/types/streaming";
import { AIProvider } from "@/lib/book/types";
import { HttpError } from "@/lib/errors";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function* streamChapter(
  bookId: string,
  chapterNumber: number,
  chapterTitle: string,
  bookPlan: PlanOutput,
  settings: {
    provider: AIProvider;
    model: string;
    language: string;
    userPreference: string;
  },
): AsyncGenerator<SSEEvent, void, unknown> {
  const outline = await ai.generateChapterOutline({
    toc: [],
    chapterTitle,
    chapterNumber,
    sourceText: "",
    bookPlan,
    settings,
  });

  yield {
    type: "chapter_start",
    data: { chapterNumber, title: chapterTitle, totalSections: outline.sections.length },
  };

  let chapterContent = `## ${chapterTitle}\n\n`;

  for (let sectionIndex = 0; sectionIndex < outline.sections.length; sectionIndex++) {
    const section = outline.sections[sectionIndex];

    yield {
      type: "section_start",
      data: { chapterNumber, sectionIndex, title: section.title },
    };

    const previousSections = outline.sections
      .slice(0, sectionIndex)
      .map((s) => ({
        title: s.title,
        summary: s.summary,
      }));

    const result = await ai.streamSectionDraft({
      chapterNumber,
      chapterTitle,
      chapterOutline: outline.sections,
      sectionIndex,
      previousSections,
      bookPlan,
      settings,
    });

    let sectionText = "";
    for await (const chunk of result.textStream) {
      sectionText += chunk;
      yield { type: "chunk", data: { chapterNumber, sectionIndex, content: chunk } };
    }

    chapterContent += sectionText + "\n\n";

    await db
      .update(books)
      .set({
        streamingStatus: {
          lastStreamedChapter: chapterNumber,
          lastStreamedSection: sectionIndex,
          lastUpdated: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(books.id, bookId));

    yield {
      type: "section_complete",
      data: { chapterNumber, sectionIndex },
    };
  }

  await db
    .insert(chapters)
    .values({
      bookId,
      chapterNumber,
      title: chapterTitle,
      content: chapterContent,
      status: "completed",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [chapters.bookId, chapters.chapterNumber],
      set: {
        content: chapterContent,
        status: "completed",
        updatedAt: new Date(),
      },
    });

  await db
    .update(books)
    .set({
      currentChapterIndex: chapterNumber,
      streamingStatus: {
        lastStreamedChapter: chapterNumber,
        lastStreamedSection: null,
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(books.id, bookId));

  yield {
    type: "chapter_complete",
    data: { chapterNumber, content: chapterContent },
  };
}

export async function resumeBook(config: ResumeConfig): Promise<Response> {
  const { bookId, userId, startFromChapter } = config;

  try {
    const book = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (book.length === 0) {
      throw new HttpError(404, "Book not found");
    }

    const bookData = book[0];

    if (bookData.status === "completed") {
      throw new HttpError(409, "Book already completed");
    }

    const toc = Array.isArray(bookData.tableOfContents)
      ? bookData.tableOfContents
      : [];

    if (toc.length === 0) {
      throw new HttpError(400, "Table of contents is empty");
    }

    const bookPlan = bookData.bookPlan as PlanOutput | null;
    if (!bookPlan) {
      throw new HttpError(400, "Book plan not found");
    }

    const completedChapters = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.bookId, bookId), eq(chapters.status, "completed")))
      .orderBy(asc(chapters.chapterNumber));

    const resumeFrom = startFromChapter || (completedChapters.length || 0) + 1;

    const settings = bookData.generationSettings as {
      provider: AIProvider;
      model: string;
      language: string;
      userPreference: string;
    } | null | undefined;

    const events = (async function* (): AsyncGenerator<SSEEvent, void, unknown> {
      yield {
        type: "progress",
        data: { phase: "resuming", message: `${resumeFrom}챕터부터 재개 중...` },
      };

      for (let chapterNum = resumeFrom; chapterNum <= toc.length; chapterNum++) {
        yield* streamChapter(bookId, chapterNum, toc[chapterNum - 1], bookPlan, {
          provider: (settings?.provider ?? "google") as AIProvider,
          model: settings?.model ?? "gemini-3-flash-preview",
          language: settings?.language ?? "Korean",
          userPreference: settings?.userPreference ?? "",
        });
      }

      const chapterRows = await db
        .select()
        .from(chapters)
        .where(eq(chapters.bookId, bookId))
        .orderBy(asc(chapters.chapterNumber));

      const completedContent = chapterRows
        .slice(0, toc.length)
        .map((c) => c.content)
        .join("\n\n");

      await db
        .update(books)
        .set({
          content: completedContent,
          status: "completed",
          error: null,
          streamingStatus: null,
          updatedAt: new Date(),
        })
        .where(eq(books.id, bookId));

      yield {
        type: "book_complete",
        data: { bookId, content: completedContent },
      };
    })();

    const { createSSEResponse } = await import("./sse");
    return createSSEResponse(events);
  } catch (error) {
    const httpError = error instanceof HttpError ? error : null;
    const errorMessage = httpError?.publicMessage ?? (error instanceof Error ? error.message : "Unknown error");

    return new NextResponse(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: httpError?.status ?? 500 },
    );
  }
}
