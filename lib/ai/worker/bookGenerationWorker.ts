import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookGenerationStates, books, chapters } from "@/db/schema";
import type { AIProvider } from "@/lib/ai/config";
import { getModel, type LanguageModel } from "@/lib/ai/core";
import type { BookGenerationJob } from "@/lib/ai/jobs/bookGeneration";
import { generateDraftTextDev } from "@/lib/ai/prompts/draftDev";
import { generateDraftText } from "@/lib/ai/prompts/draftText";
import { generateOutline } from "@/lib/ai/prompts/outline";
import { generatePlan as generatePlanPrompt } from "@/lib/ai/prompts/plan";
import { type PlanOutput, PlanSchema } from "@/lib/ai/schemas/plan";
import {
  type BookGenerationSettings,
  BookGenerationSettingsSchema,
} from "@/lib/ai/schemas/settings";
import { enqueueBookGenerationJob } from "@/lib/ai/sqs";

type BookRow = typeof books.$inferSelect;
type BookGenerationStateRow = typeof bookGenerationStates.$inferSelect;
type ChapterRow = typeof chapters.$inferSelect;

type GenerationContext = {
  book: BookRow;
  state: BookGenerationStateRow;
};

type ValidatedContext = {
  book: BookRow;
  state: BookGenerationStateRow;
  settings: BookGenerationSettings;
  toc: string[];
  sourceText: string;
  languageModel: LanguageModel;
};

type NextChapterContext = {
  chapterNumber: number;
  chapterTitle: string;
};

function getNextChapterNumber(total: number, completedNumbers: Set<number>) {
  for (let index = 1; index <= total; index++) {
    if (!completedNumbers.has(index)) return index;
  }

  return null;
}

async function loadGenerationContext(bookId: string): Promise<GenerationContext | null> {
  const found = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(eq(books.id, bookId))
    .limit(1);

  const row = found[0];
  if (!row?.book || !row.state) {
    return null;
  }

  return {
    book: row.book,
    state: row.state,
  };
}

function shouldSkipJob(state: BookGenerationStateRow, job: BookGenerationJob) {
  if (state.generationVersion !== job.generationVersion) {
    return true;
  }

  return (
    state.status === "completed" ||
    state.status === "cancelled" ||
    state.status === "cancel_requested"
  );
}

function getBookSourceData(book: BookRow) {
  if (
    !book.sourceText?.trim() ||
    !Array.isArray(book.tableOfContents) ||
    book.tableOfContents.length === 0
  ) {
    throw new Error("Invalid book source data");
  }

  return {
    toc: book.tableOfContents,
    sourceText: book.sourceText,
  };
}

function parseGenerationSettings(state: BookGenerationStateRow) {
  const parsedSettings = BookGenerationSettingsSchema.safeParse(state.generationSettings);
  if (!parsedSettings.success) {
    throw new Error("Invalid generation settings");
  }

  return parsedSettings.data;
}

function buildValidatedContext(context: GenerationContext): ValidatedContext {
  const { book, state } = context;
  const settings = parseGenerationSettings(state);
  const { toc, sourceText } = getBookSourceData(book);

  return {
    book,
    state,
    settings,
    toc,
    sourceText,
    languageModel: getModel(settings.provider as AIProvider, settings.model),
  };
}

async function markGenerationStarted(job: BookGenerationJob, state: BookGenerationStateRow) {
  const startedAt = state.startedAt ?? new Date();
  const attemptCount = (state.attemptCount ?? 0) + 1;

  await db
    .insert(bookGenerationStates)
    .values({
      bookId: job.bookId,
      status: "generating",
      startedAt,
      attemptCount,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [bookGenerationStates.bookId],
      set: {
        status: "generating",
        startedAt,
        attemptCount,
        updatedAt: new Date(),
      },
    });
}

async function persistBookPlan(bookId: string, bookPlan: PlanOutput) {
  await db
    .insert(bookGenerationStates)
    .values({
      bookId,
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

async function ensureBookPlan(
  job: BookGenerationJob,
  context: ValidatedContext,
): Promise<PlanOutput> {
  if (context.state.bookPlan) {
    return context.state.bookPlan as PlanOutput;
  }

  const planResult = await generatePlanPrompt(
    {
      sourceText: context.sourceText,
      toc: context.toc,
      language: context.settings.language,
    },
    context.languageModel,
  );
  const bookPlan = PlanSchema.parse(planResult);

  await persistBookPlan(job.bookId, bookPlan);

  return bookPlan;
}

async function loadChapterRows(bookId: string) {
  return db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(asc(chapters.chapterNumber));
}

function getCompletedChapterNumbers(chapterRows: ChapterRow[]) {
  return new Set(
    chapterRows
      .filter((chapter) => chapter.status === "completed")
      .map((chapter) => chapter.chapterNumber),
  );
}

function getNextChapterContext(toc: string[], chapterRows: ChapterRow[]): NextChapterContext | null {
  const completedNumbers = getCompletedChapterNumbers(chapterRows);
  const nextChapterNumber = getNextChapterNumber(toc.length, completedNumbers);
  if (!nextChapterNumber) {
    return null;
  }

  const chapterTitle = toc[nextChapterNumber - 1];
  if (!chapterTitle) {
    throw new Error("Missing chapter title");
  }

  return {
    chapterNumber: nextChapterNumber,
    chapterTitle,
  };
}

async function markBookCompleted(bookId: string, tocLength: number, chapterRows: ChapterRow[]) {
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
      .where(eq(books.id, bookId));

    await tx
      .insert(bookGenerationStates)
      .values({
        bookId,
        status: "completed",
        currentChapterIndex: tocLength,
        currentSectionIndex: null,
        error: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "completed",
          currentChapterIndex: tocLength,
          currentSectionIndex: null,
          error: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  });
}

async function loadActiveGenerationState(bookId: string) {
  const freshState = await db
    .select({
      status: bookGenerationStates.status,
      generationVersion: bookGenerationStates.generationVersion,
    })
    .from(bookGenerationStates)
    .where(eq(bookGenerationStates.bookId, bookId))
    .limit(1);

  return freshState[0] ?? null;
}

function isJobStillActive(
  current: { status: BookGenerationStateRow["status"]; generationVersion: number } | null,
  job: BookGenerationJob,
) {
  return !!current &&
    current.generationVersion === job.generationVersion &&
    current.status !== "cancel_requested" &&
    current.status !== "cancelled";
}

async function updateSectionProgress(bookId: string, chapterNumber: number, sectionIndex: number) {
  await db
    .insert(bookGenerationStates)
    .values({
      bookId,
      currentChapterIndex: chapterNumber,
      currentSectionIndex: sectionIndex + 1,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [bookGenerationStates.bookId],
      set: {
        currentChapterIndex: chapterNumber,
        currentSectionIndex: sectionIndex + 1,
        updatedAt: new Date(),
      },
    });
}

async function generateSectionContent(params: {
  chapterNumber: number;
  chapterTitle: string;
  outlineSections: NonNullable<Awaited<ReturnType<typeof generateOutline>>["sections"]>;
  sectionIndex: number;
  previousSections: { title: string; summary: string }[];
  bookPlan: PlanOutput;
  context: ValidatedContext;
}) {
  const draftInput = {
    chapterNumber: params.chapterNumber,
    chapterTitle: params.chapterTitle,
    chapterOutline: params.outlineSections,
    sectionIndex: params.sectionIndex,
    previousSections: params.previousSections,
    plan: params.bookPlan,
    language: params.context.settings.language,
    userPreference: params.context.settings.userPreference,
  };

  return process.env.NODE_ENV === "development"
    ? await generateDraftTextDev(draftInput, params.context.languageModel)
    : await generateDraftText(draftInput, params.context.languageModel);
}

async function saveCompletedChapter(params: {
  bookId: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  outline: Awaited<ReturnType<typeof generateOutline>>;
}) {
  await db.transaction(async (tx) => {
    await tx
      .insert(chapters)
      .values({
        bookId: params.bookId,
        chapterNumber: params.chapterNumber,
        title: params.chapterTitle,
        content: params.chapterContent,
        outline: params.outline,
        status: "completed",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chapters.bookId, chapters.chapterNumber],
        set: {
          title: params.chapterTitle,
          content: params.chapterContent,
          outline: params.outline,
          status: "completed",
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(bookGenerationStates)
      .values({
        bookId: params.bookId,
        status: "generating",
        currentChapterIndex: params.chapterNumber,
        currentSectionIndex: null,
        error: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "generating",
          currentChapterIndex: params.chapterNumber,
          currentSectionIndex: null,
          error: null,
          updatedAt: new Date(),
        },
      });
  });
}

async function generateNextChapter(
  job: BookGenerationJob,
  context: ValidatedContext,
  bookPlan: PlanOutput,
  nextChapter: NextChapterContext,
) {
  const outline = await generateOutline(
    {
      toc: context.toc,
      chapterTitle: nextChapter.chapterTitle,
      chapterNumber: nextChapter.chapterNumber,
      sourceText: context.sourceText,
      plan: bookPlan,
      language: context.settings.language,
      userPreference: context.settings.userPreference,
    },
    context.languageModel,
  );

  let chapterContent = `## ${nextChapter.chapterTitle}\n\n`;

  for (let sectionIndex = 0; sectionIndex < outline.sections.length; sectionIndex++) {
    const current = await loadActiveGenerationState(job.bookId);
    if (!isJobStillActive(current, job)) {
      return { ok: true as const, skipped: true };
    }

    const previousSections = outline.sections.slice(0, sectionIndex).map((section) => ({
      title: section.title,
      summary: section.summary,
    }));

    await updateSectionProgress(job.bookId, nextChapter.chapterNumber, sectionIndex);

    const sectionText = await generateSectionContent({
      chapterNumber: nextChapter.chapterNumber,
      chapterTitle: nextChapter.chapterTitle,
      outlineSections: outline.sections,
      sectionIndex,
      previousSections,
      bookPlan,
      context,
    });

    chapterContent += `${sectionText}\n\n`;
  }

  await saveCompletedChapter({
    bookId: job.bookId,
    chapterNumber: nextChapter.chapterNumber,
    chapterTitle: nextChapter.chapterTitle,
    chapterContent,
    outline,
  });

  return { ok: true as const, skipped: false };
}

async function enqueueContinuation(job: BookGenerationJob) {
  await enqueueBookGenerationJob({
    bookId: job.bookId,
    generationVersion: job.generationVersion,
    trigger: "continue",
  });
}

export async function runBookGenerationJob(job: BookGenerationJob) {
  const loadedContext = await loadGenerationContext(job.bookId);
  if (!loadedContext) {
    return { ok: true as const, skipped: true };
  }

  if (shouldSkipJob(loadedContext.state, job)) {
    return { ok: true as const, skipped: true };
  }

  const context = buildValidatedContext(loadedContext);

  await markGenerationStarted(job, context.state);

  const bookPlan = await ensureBookPlan(job, context);
  const chapterRows = await loadChapterRows(job.bookId);
  const nextChapter = getNextChapterContext(context.toc, chapterRows);

  if (!nextChapter) {
    await markBookCompleted(job.bookId, context.toc.length, chapterRows);
    return { ok: true as const, skipped: false };
  }

  const result = await generateNextChapter(job, context, bookPlan, nextChapter);
  if (result.skipped) {
    return result;
  }

  await enqueueContinuation(job);

  return { ok: true as const, skipped: false };
}
