import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookGenerationStates, books, chapters } from "@/db/schema";
import type { AIProvider } from "@/lib/ai/config";
import { getModel } from "@/lib/ai/core";
import type { BookGenerationJob } from "@/lib/ai/jobs/bookGeneration";
import { streamDraft } from "@/lib/ai/prompts/draft";
import { streamDraftDev } from "@/lib/ai/prompts/draftDev";
import { generateOutline } from "@/lib/ai/prompts/outline";
import { generatePlan as generatePlanPrompt } from "@/lib/ai/prompts/plan";
import { type PlanOutput, PlanSchema } from "@/lib/ai/schemas/plan";
import { BookGenerationSettingsSchema } from "@/lib/ai/schemas/settings";
import { enqueueBookGenerationJob } from "@/lib/ai/sqs";

function getNextChapterNumber(total: number, completedNumbers: Set<number>) {
  for (let index = 1; index <= total; index++) {
    if (!completedNumbers.has(index)) return index;
  }
  return null;
}

export async function runBookGenerationJob(job: BookGenerationJob) {
  const found = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(eq(books.id, job.bookId))
    .limit(1);

  const row = found[0];
  if (!row?.book || !row.state) {
    return { ok: true as const, skipped: true };
  }

  const state = row.state;
  const book = row.book;

  if (state.generationVersion !== job.generationVersion) {
    return { ok: true as const, skipped: true };
  }

  if (
    state.status === "completed" ||
    state.status === "cancelled" ||
    state.status === "cancel_requested"
  ) {
    return { ok: true as const, skipped: true };
  }

  if (
    !book.sourceText?.trim() ||
    !Array.isArray(book.tableOfContents) ||
    book.tableOfContents.length === 0
  ) {
    throw new Error("Invalid book source data");
  }

  const parsedSettings = BookGenerationSettingsSchema.safeParse(state.generationSettings);
  if (!parsedSettings.success) {
    throw new Error("Invalid generation settings");
  }
  const settings = parsedSettings.data;

  await db
    .insert(bookGenerationStates)
    .values({
      bookId: job.bookId,
      status: "generating",
      startedAt: state.startedAt ?? new Date(),
      attemptCount: (state.attemptCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [bookGenerationStates.bookId],
      set: {
        status: "generating",
        startedAt: state.startedAt ?? new Date(),
        attemptCount: (state.attemptCount ?? 0) + 1,
        updatedAt: new Date(),
      },
    });

  const toc = book.tableOfContents;
  const sourceText = book.sourceText;

  let bookPlan = state.bookPlan as PlanOutput | null;
  if (!bookPlan) {
    const languageModel = getModel(settings.provider as AIProvider, settings.model);
    const planResult = await generatePlanPrompt(
      { sourceText, toc, language: settings.language },
      languageModel,
    );
    bookPlan = PlanSchema.parse(planResult);

    await db
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        bookPlan,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          bookPlan,
          updatedAt: new Date(),
        },
      });
  }

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, job.bookId))
    .orderBy(asc(chapters.chapterNumber));

  const completedNumbers = new Set(
    chapterRows
      .filter((chapter) => chapter.status === "completed")
      .map((chapter) => chapter.chapterNumber),
  );

  const nextChapterNumber = getNextChapterNumber(toc.length, completedNumbers);
  if (!nextChapterNumber) {
    const fullContent = chapterRows
      .filter((chapter) => chapter.status === "completed")
      .sort((left, right) => left.chapterNumber - right.chapterNumber)
      .map((chapter) => chapter.content)
      .join("\n\n");

    await db.transaction(async (tx) => {
      await tx
        .update(books)
        .set({
          content: fullContent,
          updatedAt: new Date(),
        })
        .where(eq(books.id, job.bookId));

      await tx
        .insert(bookGenerationStates)
        .values({
          bookId: job.bookId,
          status: "completed",
          currentChapterIndex: toc.length,
          currentSectionIndex: null,
          error: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [bookGenerationStates.bookId],
          set: {
            status: "completed",
            currentChapterIndex: toc.length,
            currentSectionIndex: null,
            error: null,
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    });

    return { ok: true as const, skipped: false };
  }

  const chapterTitle = toc[nextChapterNumber - 1];
  if (!chapterTitle) {
    throw new Error("Missing chapter title");
  }

  const languageModel = getModel(settings.provider as AIProvider, settings.model);
  const outline = await generateOutline(
    {
      toc,
      chapterTitle,
      chapterNumber: nextChapterNumber,
      sourceText,
      plan: bookPlan,
      language: settings.language,
      userPreference: settings.userPreference,
    },
    languageModel,
  );

  let chapterContent = `## ${chapterTitle}\n\n`;

  for (let sectionIndex = 0; sectionIndex < outline.sections.length; sectionIndex++) {
    const freshState = await db
      .select({
        status: bookGenerationStates.status,
        generationVersion: bookGenerationStates.generationVersion,
      })
      .from(bookGenerationStates)
      .where(eq(bookGenerationStates.bookId, job.bookId))
      .limit(1);

    const current = freshState[0];
    if (
      !current ||
      current.generationVersion !== job.generationVersion ||
      current.status === "cancel_requested" ||
      current.status === "cancelled"
    ) {
      return { ok: true as const, skipped: true };
    }

    const previousSections = outline.sections.slice(0, sectionIndex).map((section) => ({
      title: section.title,
      summary: section.summary,
    }));

    await db
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        currentChapterIndex: nextChapterNumber,
        currentSectionIndex: sectionIndex + 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          currentChapterIndex: nextChapterNumber,
          currentSectionIndex: sectionIndex + 1,
          updatedAt: new Date(),
        },
      });

    const result =
      process.env.NODE_ENV === "development"
        ? streamDraftDev(
            {
              chapterNumber: nextChapterNumber,
              chapterTitle,
              chapterOutline: outline.sections,
              sectionIndex,
              previousSections,
              plan: bookPlan,
              language: settings.language,
              userPreference: settings.userPreference,
            },
            languageModel,
          )
        : streamDraft(
            {
              chapterNumber: nextChapterNumber,
              chapterTitle,
              chapterOutline: outline.sections,
              sectionIndex,
              previousSections,
              plan: bookPlan,
              language: settings.language,
              userPreference: settings.userPreference,
            },
            languageModel,
          );

    let sectionText = "";
    for await (const chunk of result.textStream) {
      sectionText += chunk;
    }

    chapterContent += `${sectionText}\n\n`;
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(chapters)
      .values({
        bookId: job.bookId,
        chapterNumber: nextChapterNumber,
        title: chapterTitle,
        content: chapterContent,
        outline,
        status: "completed",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chapters.bookId, chapters.chapterNumber],
        set: {
          title: chapterTitle,
          content: chapterContent,
          outline,
          status: "completed",
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        status: "generating",
        currentChapterIndex: nextChapterNumber,
        currentSectionIndex: null,
        error: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "generating",
          currentChapterIndex: nextChapterNumber,
          currentSectionIndex: null,
          error: null,
          updatedAt: new Date(),
        },
      });
  });

  await enqueueBookGenerationJob({
    bookId: job.bookId,
    generationVersion: job.generationVersion,
    trigger: "continue",
  });

  return { ok: true as const, skipped: false };
}
