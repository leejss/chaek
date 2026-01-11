"use server";

import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AIProvider, GeminiModel, ClaudeModel } from "@/lib/ai/config";
import { getModel } from "@/lib/ai/core";
import { BookSettings } from "@/lib/book/settings";
import { PlanOutput, PlanSchema } from "@/lib/ai/schemas/plan";
import { ChapterOutline } from "@/lib/book/types";
import { ChapterOutlineSchema } from "@/lib/ai/schemas/outline";
import { TocOutput, TocSchema } from "@/lib/ai/schemas/toc";
import {
  ChapterSummaryOutput,
  ChapterSummarySchema,
} from "@/lib/ai/schemas/summary";
import { generateToc } from "@/lib/ai/prompts/toc";
import { generatePlan as generatePlanPrompt } from "@/lib/ai/prompts/plan";
import { generateOutline } from "@/lib/ai/prompts/outline";
import { generateSummary } from "@/lib/ai/prompts/summary";

export interface GenerateTocParams {
  sourceText: string;
  language: string;
  chapterCount: number | "Auto";
  userPreference?: string;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
}

export async function generateTocAction(
  params: GenerateTocParams,
): Promise<TocOutput> {
  const {
    sourceText,
    language,
    chapterCount,
    userPreference,
    provider,
    model,
  } = params;

  const languageModel = getModel(provider, model);
  const minChapters = chapterCount === "Auto" ? 5 : chapterCount || 5;
  const maxChapters = chapterCount === "Auto" ? 10 : chapterCount || 10;

  const result = await generateToc(
    { sourceText, language, minChapters, maxChapters, userPreference },
    languageModel,
  );

  return TocSchema.parse(result);
}

export interface GeneratePlanParams {
  bookId: string;
  sourceText: string;
  toc: string[];
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}

export async function generatePlanAction(
  params: GeneratePlanParams,
): Promise<PlanOutput> {
  const { sourceText, toc, provider, model, settings, bookId } = params;

  const languageModel = getModel(provider, model);
  const language = settings?.language || "Korean";

  const planResult = await generatePlanPrompt(
    { sourceText, toc, language },
    languageModel,
  );

  const parsedPlan = PlanSchema.parse(planResult);

  await db
    .update(books)
    .set({ bookPlan: parsedPlan })
    .where(eq(books.id, bookId));

  return parsedPlan;
}

export interface GenerateOutlineParams {
  bookId?: string;
  toc: string[];
  chapterNumber: number;
  sourceText: string;
  bookPlan?: PlanOutput;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}

export async function generateOutlineAction(
  params: GenerateOutlineParams,
): Promise<ChapterOutline> {
  const {
    bookId,
    toc,
    chapterNumber,
    sourceText,
    bookPlan,
    provider,
    model,
    settings,
  } = params;

  const chapterTitle = toc[chapterNumber - 1];
  if (!chapterTitle) {
    throw new Error("Chapter title not found in TOC");
  }

  if (bookId) {
    const existingChapter = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.bookId, bookId),
          eq(chapters.chapterNumber, chapterNumber),
        ),
      )
      .limit(1);

    // 기존 챕터가 있으면 outline을 가져옴
    if (existingChapter[0]?.outline) {
      return ChapterOutlineSchema.parse(
        existingChapter[0].outline,
      ) as ChapterOutline;
    }
  }

  if (!bookPlan) {
    throw new Error("Book plan is required for outline generation");
  }

  const languageModel = getModel(provider, model);
  const language = settings?.language || "Korean";
  const userPreference = settings?.userPreference;

  const result = await generateOutline(
    {
      toc,
      chapterTitle,
      chapterNumber,
      sourceText,
      plan: bookPlan,
      language,
      userPreference,
    },
    languageModel,
  );

  return ChapterOutlineSchema.parse(result) as ChapterOutline;
}

export interface GenerateSummaryParams {
  chapterId: string;
  finalText: string;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  language: string;
}

export async function generateSummaryAction(
  params: GenerateSummaryParams,
): Promise<ChapterSummaryOutput> {
  const { chapterId, finalText, provider, model } = params;

  const languageModel = getModel(provider, model);

  const result = await generateSummary({ chapterId, finalText }, languageModel);

  return ChapterSummarySchema.parse(result);
}
