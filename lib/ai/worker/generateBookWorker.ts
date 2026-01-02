import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { GenerateBookJob } from "@/lib/ai/jobs/types";
import { ai } from "@/lib/ai/core/ai";
import { PlanOutput } from "@/lib/ai/specs/plan";
import { BookSettings } from "@/lib/book/settings";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { enqueueGenerateBookJob } from "./bookGenerationQueue";

function toSettings(job: GenerateBookJob): BookSettings {
  return {
    language: job.language,
    chapterCount: "Auto",
    userPreference: job.userPreference ?? "",
  };
}

function normalizeToc(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
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
    .select()
    .from(books)
    .where(eq(books.id, job.bookId))
    .limit(1);

  const book = existing[0];
  if (!book) {
    throw new Error("Book not found");
  }

  const toc = normalizeToc(book.tableOfContents);
  if (!book.sourceText || toc.length === 0) {
    await db
      .update(books)
      .set({
        status: "failed",
        error: "Missing sourceText or tableOfContents",
        updatedAt: new Date(),
      })
      .where(eq(books.id, job.bookId));
    return;
  }

  await db
    .update(books)
    .set({
      status: "generating",
      error: null,
      generationSettings: {
        provider: job.provider,
        model: job.model,
        language: job.language,
        userPreference: job.userPreference,
      },
      updatedAt: new Date(),
    })
    .where(
      and(eq(books.id, job.bookId), inArray(books.status, ["draft", "failed"])),
    );

  const settings = toSettings(job);
  const existingPlan = book.bookPlan as PlanOutput | null | undefined;

  if (!existingPlan) {
    const plan = await ai.generatePlan(book.sourceText, toc, {
      provider: job.provider,
      model: job.model,
      language: settings.language,
      userPreference: settings.userPreference,
    });

    await db
      .update(books)
      .set({
        bookPlan: plan,
        updatedAt: new Date(),
      })
      .where(eq(books.id, job.bookId));
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
    .select()
    .from(books)
    .where(eq(books.id, job.bookId))
    .limit(1);

  const book = found[0];
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

  const plan = book.bookPlan as PlanOutput | null | undefined;
  if (!plan) throw new Error("Book plan missing");

  const outline = await ai.generateChapterOutline({
    toc,
    chapterTitle,
    chapterNumber,
    sourceText: book.sourceText,
    bookPlan: plan,
    settings: {
      provider: job.provider,
      model: job.model,
      language: job.language,
      userPreference: job.userPreference ?? "",
    },
  });

  let chapterContent = `## ${chapterTitle}\n\n`;
  const completedSummaries: Array<{ title: string; summary: string }> = [];

  for (
    let sectionIndex = 0;
    sectionIndex < outline.sections.length;
    sectionIndex++
  ) {
    const sectionText = await ai.generateSectionDraftText({
      chapterNumber,
      chapterTitle,
      chapterOutline: outline.sections,
      sectionIndex,
      previousSections: completedSummaries,
      bookPlan: plan,
      settings: {
        provider: job.provider,
        model: job.model,
        language: job.language,
        userPreference: job.userPreference ?? "",
      },
    });

    chapterContent += sectionText + "\n\n";
    completedSummaries.push({
      title: outline.sections[sectionIndex].title,
      summary: outline.sections[sectionIndex].summary,
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
      .update(books)
      .set({
        currentChapterIndex: chapterNumber,
        updatedAt: new Date(),
      })
      .where(eq(books.id, job.bookId));
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
    .select()
    .from(books)
    .where(eq(books.id, job.bookId))
    .limit(1);

  const book = found[0];
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

  await db
    .update(books)
    .set({
      content: fullContent,
      status: "completed",
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(books.id, job.bookId));
}
