import { db } from "@/db";
import { bookGenerationStates, books, chapters } from "@/db/schema";
import { GenerateBookJob } from "@/lib/ai/jobs/types";
import { PlanOutput } from "@/lib/ai/schemas/plan";
import { BookSettings } from "@/context/types/settings";
import { normalizeToc } from "@/lib/ai/utils";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { enqueueGenerateBookJob } from "./bookGenerationQueue";
import { getModel } from "@/lib/ai/core";
import { generatePlan as generatePlanPrompt } from "@/lib/ai/prompts/plan";
import { generateOutline } from "@/lib/ai/prompts/outline";
import { generateDraftText } from "@/lib/ai/prompts/draftText";

function toSettings(job: GenerateBookJob): BookSettings {
  return {
    language: job.language,
    chapterCount: "Auto",
    userPreference: job.userPreference ?? "",
  };
}

export async function handleGenerateBookJob(job: GenerateBookJob) {
  if (job.step === "init") {
    return initGeneration(job);
  }
  if (job.step === "chapter") {
    return generateChapter(job);
  }
  if (job.step === "finalize") {
    return finalizeBook(job);
  }
  const _exhaustive: never = job.step;
  return _exhaustive;
}

async function initGeneration(job: GenerateBookJob) {
  const existing = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(eq(books.id, job.bookId))
    .limit(1);

  const row = existing[0];
  const book = row?.book;
  const state = row?.state;
  if (!book) {
    throw new Error("Book not found");
  }

  const toc = normalizeToc(book.tableOfContents);
  if (!book.sourceText || toc.length === 0) {
    await db
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        status: "failed",
        error: "Missing sourceText or tableOfContents",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "failed",
          error: "Missing sourceText or tableOfContents",
          updatedAt: new Date(),
        },
      });
    return;
  }

  const nextGenerationSettings = {
    provider: job.provider,
    model: job.model,
    language: job.language,
    chapterCount: "Auto" as const,
    userPreference: job.userPreference,
  };

  await db
    .insert(bookGenerationStates)
    .values({
      bookId: job.bookId,
      status: "generating",
      error: null,
      generationSettings: nextGenerationSettings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [bookGenerationStates.bookId],
      set: {
        status: "generating",
        error: null,
        generationSettings: nextGenerationSettings,
        updatedAt: new Date(),
      },
    });

  const settings = toSettings(job);
  const existingPlan = state?.bookPlan as PlanOutput | null | undefined;

  if (!existingPlan) {
    const languageModel = getModel(job.provider, job.model);
    const plan = await generatePlanPrompt(
      { sourceText: book.sourceText, toc, language: settings.language },
      languageModel,
    );

    await db
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        bookPlan: plan,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          bookPlan: plan,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(chapters)
    .values(
      toc.map((title, idx) => ({
        bookId: job.bookId,
        chapterNumber: idx + 1,
        title,
        status: "pending" as const,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: [chapters.bookId, chapters.chapterNumber],
      set: {
        title: sql`excluded.title`,
        updatedAt: new Date(),
      },
    });

  await enqueueGenerateBookJob({
    ...job,
    step: "chapter",
    chapterNumber: 1,
  });
}

async function generateChapter(job: GenerateBookJob) {
  const chapterNumber = job.chapterNumber;
  if (chapterNumber == null) throw new Error("Missing chapterNumber");

  const found = await db
    .select({ book: books, state: bookGenerationStates })
    .from(books)
    .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
    .where(eq(books.id, job.bookId))
    .limit(1);

  const row = found[0];
  const book = row?.book;
  const state = row?.state;
  if (!book) throw new Error("Book not found");

  const toc = normalizeToc(book.tableOfContents);
  const chapterTitle = toc[chapterNumber - 1];
  if (!book.sourceText || !chapterTitle) {
    throw new Error("Missing sourceText or chapter title");
  }

  const [chapterRow] = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.bookId, job.bookId),
        eq(chapters.chapterNumber, chapterNumber),
      ),
    )
    .limit(1);

  if (!chapterRow) throw new Error("Chapter row not found");
  if (chapterRow.status === "completed") {
    await enqueueNextOrFinalize(job, toc.length);
    return;
  }

  await db
    .update(chapters)
    .set({ status: "generating", updatedAt: new Date() })
    .where(
      and(
        eq(chapters.bookId, job.bookId),
        eq(chapters.chapterNumber, chapterNumber),
        inArray(chapters.status, ["pending", "failed", "generating"]),
      ),
    );

  const plan = state?.bookPlan as PlanOutput | null | undefined;
  if (!plan) throw new Error("Book plan missing");

  const languageModel = getModel(job.provider, job.model);

  const outline = await generateOutline(
    {
      toc,
      chapterTitle,
      chapterNumber,
      sourceText: book.sourceText,
      plan,
      language: job.language,
      userPreference: job.userPreference,
    },
    languageModel,
  );

  let chapterContent = `## ${chapterTitle}\n\n`;
  const completedSummaries: Array<{ title: string; summary: string }> = [];

  for (
    let sectionIndex = 0;
    sectionIndex < outline.sections.length;
    sectionIndex++
  ) {
    const section = outline.sections[sectionIndex];
    if (!section) {
      throw new Error("Invalid section");
    }

    const sectionText = await generateDraftText(
      {
        chapterNumber,
        chapterTitle,
        chapterOutline: outline.sections,
        sectionIndex,
        previousSections: completedSummaries,
        plan,
        language: job.language,
        userPreference: job.userPreference,
      },
      languageModel,
    );

    chapterContent += sectionText + "\n\n";
    completedSummaries.push({
      title: section.title,
      summary: section.summary,
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(chapters)
      .set({
        content: chapterContent,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chapters.bookId, job.bookId),
          eq(chapters.chapterNumber, chapterNumber),
        ),
      );

    await tx
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        currentChapterIndex: chapterNumber,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          currentChapterIndex: chapterNumber,
          updatedAt: new Date(),
        },
      });
  });

  await enqueueNextOrFinalize(job, toc.length);
}

async function enqueueNextOrFinalize(
  job: GenerateBookJob,
  totalChapters: number,
) {
  const nextChapter = (job.chapterNumber || 0) + 1;

  if (nextChapter <= totalChapters) {
    await enqueueGenerateBookJob({
      ...job,
      step: "chapter",
      chapterNumber: nextChapter,
    });
    return;
  }

  await enqueueGenerateBookJob({
    ...job,
    step: "finalize",
  });
}

async function finalizeBook(job: GenerateBookJob) {
  const found = await db
    .select({ book: books })
    .from(books)
    .where(eq(books.id, job.bookId))
    .limit(1);

  const book = found[0]?.book;
  if (!book) throw new Error("Book not found");

  const toc = normalizeToc(book.tableOfContents);

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, job.bookId))
    .orderBy(asc(chapters.chapterNumber));

  const allCompleted =
    toc.length > 0 &&
    chapterRows.length >= toc.length &&
    chapterRows.slice(0, toc.length).every((c) => c.status === "completed");

  if (!allCompleted) {
    throw new Error("Not all chapters completed");
  }

  const fullContent = chapterRows
    .slice(0, toc.length)
    .map((c) => c.content)
    .join("\n\n");

  await db.transaction(async (tx) => {
    await tx
      .insert(bookGenerationStates)
      .values({
        bookId: job.bookId,
        status: "completed",
        error: null,
        streamingStatus: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookGenerationStates.bookId],
        set: {
          status: "completed",
          error: null,
          streamingStatus: null,
          updatedAt: new Date(),
        },
      });

    await tx
      .update(books)
      .set({
        content: fullContent,
        updatedAt: new Date(),
      })
      .where(eq(books.id, job.bookId));
  });
}
