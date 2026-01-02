"use server";

import {
  generatePlan,
  generateChapterOutline,
  generateTableOfContent,
  generateChapterSummary,
} from "@/lib/ai/core/ai";
import { AIProvider, GeminiModel, ClaudeModel } from "@/lib/book/types";
import { BookSettings } from "@/lib/book/settings";
import { PlanOutput, PlanSchema } from "@/lib/ai/specs/plan";
import { ChapterOutline } from "@/lib/book/types";
import { ChapterOutlineSchema } from "@/lib/ai/specs/outline";
import { TocOutput, TocSchema } from "@/lib/ai/specs/toc";
import {
  ChapterSummaryOutput,
  ChapterSummarySchema,
} from "@/lib/ai/specs/summary";

export interface GenerateTocParams {
  sourceText: string;
  language?: string;
  chapterCount?: number | "Auto";
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

  const result = await generateTableOfContent({
    sourceText,
    language: language || "Korean",
    chapterCount: chapterCount || "Auto",
    userPreference,
    provider,
    model,
  });

  if (!result) {
    throw new Error("Failed to generate TOC");
  }

  return TocSchema.parse(result);
}

export interface GeneratePlanParams {
  sourceText: string;
  toc: string[];
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}

export async function generatePlanAction(
  params: GeneratePlanParams,
): Promise<PlanOutput> {
  const { sourceText, toc, provider, model, settings } = params;

  const planResult = await generatePlan({
    sourceText,
    toc,
    language: settings?.language || "Korean",
    provider,
    model,
  });

  if (!planResult) {
    throw new Error("Failed to generate plan");
  }

  return PlanSchema.parse(planResult);
}

export interface GenerateOutlineParams {
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

  if (!bookPlan) {
    throw new Error("Book plan is required for outline generation");
  }

  const result = await generateChapterOutline({
    toc,
    chapterTitle,
    chapterNumber,
    sourceText,
    plan: bookPlan,
    provider,
    model,
    language: settings?.language || "Korean",
    userPreference: settings?.userPreference,
  });

  if (!result) {
    throw new Error("Failed to generate chapter outline");
  }

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
  const { chapterId, finalText, provider, model, language } = params;

  const result = await generateChapterSummary(chapterId, finalText, {
    provider,
    model,
    language,
  });

  if (!result) {
    throw new Error("Failed to generate chapter summary");
  }

  return ChapterSummarySchema.parse(result);
}
