import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { ai, generatePlan } from "@/lib/ai/core/ai";
import { PlanOutput } from "@/lib/ai/specs/plan";
import { SSEEvent, StreamingConfig } from "@/lib/ai/types/streaming";
import { AIProvider } from "@/lib/book/types";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import {
  initializeBookAndDeductCredits,
  refundUsageCredits,
} from "@/lib/credits/operations";
import { HttpError } from "@/lib/errors";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSSEResponse } from "./sse";

function normalizeToc(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
}

async function saveChapterContent(
  bookId: string,
  chapterNumber: number,
  title: string,
  content: string,
) {
  await db
    .insert(chapters)
    .values({
      bookId,
      chapterNumber,
      title,
      content,
      status: "completed",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [chapters.bookId, chapters.chapterNumber],
      set: {
        content,
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
}

async function updateStreamingStatus(
  bookId: string,
  chapterNumber: number,
  sectionIndex: number,
) {
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
}

export async function streamBook(config: StreamingConfig): Promise<Response> {
  const {
    bookId,
    userId,
    sourceText,
    tableOfContents,
    title,
    provider,
    model,
    language,
    userPreference,
    startFromChapter = 1,
  } = config;

  const toc = normalizeToc(tableOfContents);
  const startChapter = Math.max(1, startFromChapter);

  let createdNewBook = false;
  let didDeductCredits = false;
  let bookPlan: PlanOutput | null = null;

  try {
    if (!sourceText || toc.length === 0) {
      throw new Error("Missing sourceText or tableOfContents");
    }

    const { isNewBook } = await initializeBookAndDeductCredits({
      userId,
      bookId,
      title,
      tableOfContents: toc,
      sourceText,
      cost: BOOK_CREATION_COST,
      startChapter,
    });

    createdNewBook = isNewBook;
    didDeductCredits = true;

    const events = (async function* (): AsyncGenerator<
      SSEEvent,
      void,
      unknown
    > {
      try {
        yield {
          type: "progress",
          data: { phase: "plan", message: "플랜 생성 중..." },
        };

        const existingBook = await db
          .select()
          .from(books)
          .where(eq(books.id, bookId))
          .limit(1);
        const savedPlan = existingBook[0]?.bookPlan as PlanOutput | null;
        if (savedPlan) {
          bookPlan = savedPlan;
        } else {
          bookPlan = await generatePlan({
            sourceText,
            toc,
            provider: provider as AIProvider,
            model,
            language,
          });

          await db
            .update(books)
            .set({ bookPlan, updatedAt: new Date() })
            .where(eq(books.id, bookId));
        }

        for (
          let chapterNum = startChapter;
          chapterNum <= toc.length;
          chapterNum++
        ) {
          yield* streamChapter(
            bookId,
            chapterNum,
            toc[chapterNum - 1],
            bookPlan,
            toc,
            sourceText,
            {
              provider: provider as AIProvider,
              model,
              language,
              userPreference,
            },
          );
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
      } catch (error) {
        if (didDeductCredits) {
          try {
            await refundUsageCredits({
              userId,
              amount: BOOK_CREATION_COST,
              bookId,
              metadata: { reason: "streaming_generation_failed" },
            });
          } catch (refundError) {
            console.error("[streamBook] refund failed:", refundError);
          }
        }

        if (createdNewBook) {
          await db.delete(books).where(eq(books.id, bookId));
        }

        const httpError = error instanceof HttpError ? error : null;
        yield {
          type: "error",
          data: {
            message:
              httpError?.publicMessage ??
              (error instanceof Error ? error.message : "Unknown error"),
          },
        };
      }
    })();

    return createSSEResponse(events);
  } catch (error) {
    if (didDeductCredits) {
      try {
        const book = await db
          .select()
          .from(books)
          .where(eq(books.id, bookId))
          .limit(1);
        await refundUsageCredits({
          userId: book[0]?.userId ?? "",
          amount: BOOK_CREATION_COST,
          bookId,
          metadata: { reason: "streaming_generation_failed" },
        });
      } catch (refundError) {
        console.error("[streamBook] refund failed:", refundError);
      }
    }

    if (createdNewBook) {
      await db.delete(books).where(eq(books.id, bookId));
    }

    const httpError = error instanceof HttpError ? error : null;
    const errorMessage =
      httpError?.publicMessage ??
      (error instanceof Error ? error.message : "Unknown error");

    return new NextResponse(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: httpError?.status ?? 500 },
    );
  }
}

async function* streamChapter(
  bookId: string,
  chapterNumber: number,
  chapterTitle: string,
  bookPlan: PlanOutput,
  toc: string[],
  sourceText: string,
  settings: {
    provider: AIProvider;
    model: string;
    language: string;
    userPreference: string;
  },
): AsyncGenerator<SSEEvent, void, unknown> {
  const outlineResult = await ai.generateChapterOutline({
    toc,
    chapterTitle,
    chapterNumber,
    sourceText,
    plan: bookPlan,
    provider: settings.provider,
    model: settings.model,
    language: settings.language,
    userPreference: settings.userPreference,
  });

  yield {
    type: "chapter_start",
    data: {
      chapterNumber,
      title: chapterTitle,
      totalSections: outlineResult.sections.length,
    },
  };

  let chapterContent = `## ${chapterTitle}\n\n`;
  const sectionContents: string[] = [];

  for (
    let sectionIndex = 0;
    sectionIndex < outlineResult.sections.length;
    sectionIndex++
  ) {
    const section = outlineResult.sections[sectionIndex];

    yield {
      type: "section_start",
      data: { chapterNumber, sectionIndex, title: section.title },
    };

    const previousSections = outlineResult.sections
      .slice(0, sectionIndex)
      .map((s) => ({
        title: s.title,
        summary: s.summary,
      }));

    const streamFunc =
      process.env.NODE_ENV === "development"
        ? ai.streamSectionDraftDev
        : ai.streamSectionDraft;

    const result = await streamFunc({
      chapterNumber,
      chapterTitle,
      chapterOutline: outlineResult.sections,
      sectionIndex,
      previousSections,
      bookPlan,
      settings,
    });

    let sectionText = "";
    for await (const chunk of result.textStream) {
      sectionText += chunk;
      yield {
        type: "chunk",
        data: { chapterNumber, sectionIndex, content: chunk },
      };
    }

    sectionContents.push(sectionText);
    chapterContent += sectionText + "\n\n";

    await updateStreamingStatus(bookId, chapterNumber, sectionIndex);

    yield {
      type: "section_complete",
      data: { chapterNumber, sectionIndex },
    };
  }

  await saveChapterContent(bookId, chapterNumber, chapterTitle, chapterContent);

  yield {
    type: "chapter_complete",
    data: { chapterNumber, content: chapterContent },
  };
}
