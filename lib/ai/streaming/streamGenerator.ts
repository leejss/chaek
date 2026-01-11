import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { PlanOutput } from "@/lib/ai/schemas/plan";
import { SSEEvent, StreamingConfig } from "@/lib/ai/types/streaming";
import { AIProvider } from "@/lib/ai/config";
import { getModel } from "@/lib/ai/core";
import { generatePlan as generatePlanPrompt } from "@/lib/ai/prompts/plan";
import { generateOutline } from "@/lib/ai/prompts/outline";
import { streamDraft } from "@/lib/ai/prompts/draft";
import { streamDraftDev } from "@/lib/ai/prompts/draftDev";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import { initializeBookAndDeductCredits } from "@/lib/credits/operations";
import { HttpError } from "@/lib/errors";
import { normalizeToc, handleGenerationError } from "@/lib/ai/utils";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSSEResponse } from "./sse";

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
          const languageModel = getModel(provider as AIProvider, model);
          bookPlan = await generatePlanPrompt(
            { sourceText, toc, language },
            languageModel,
          );

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
        const { message } = await handleGenerationError({
          error,
          didDeductCredits,
          createdNewBook,
          userId,
          bookId,
        });
        yield { type: "error", data: { message } };
      }
    })();

    return createSSEResponse(events);
  } catch (error) {
    const { message } = await handleGenerationError({
      error,
      didDeductCredits,
      createdNewBook,
      userId,
      bookId,
    });

    const httpError = error instanceof HttpError ? error : null;
    return new NextResponse(JSON.stringify({ ok: false, error: message }), {
      status: httpError?.status ?? 500,
    });
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
  const languageModel = getModel(settings.provider, settings.model);

  const outlineResult = await generateOutline(
    {
      toc,
      chapterTitle,
      chapterNumber,
      sourceText,
      plan: bookPlan,
      language: settings.language,
      userPreference: settings.userPreference,
    },
    languageModel,
  );

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

    const draftInput = {
      chapterNumber,
      chapterTitle,
      chapterOutline: outlineResult.sections,
      sectionIndex,
      previousSections,
      plan: bookPlan,
      language: settings.language,
      userPreference: settings.userPreference,
    };

    const result =
      process.env.NODE_ENV === "development"
        ? streamDraftDev(draftInput, languageModel)
        : streamDraft(draftInput, languageModel);

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
