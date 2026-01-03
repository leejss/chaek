import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/book/types";
import { serverEnv } from "@/lib/env";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { draftV1 } from "../specs/draft";
import { draftDevV1 } from "../specs/draftDev";
import { draftTextV1 } from "../specs/draftText";
import { outlineV1 } from "../specs/outline";
import { PlanOutput, planV1 } from "../specs/plan";
import { summaryV1 } from "../specs/summary";
import { tocV1 } from "../specs/toc";
import { registry } from "./registry";

export interface GenerationSettings {
  provider: AIProvider;
  model: string;
  language: string;
  chapterCount?: number | "Auto";
  userPreference?: string;
}

registry.register(tocV1);
registry.register(planV1);
registry.register(outlineV1);
registry.register(draftV1);
registry.register(draftDevV1);
registry.register(draftTextV1);
registry.register(summaryV1);

const google = createGoogleGenerativeAI({ apiKey: serverEnv.GEMINI_API_KEY });
const anthropic = createAnthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY });

function getModel(
  provider: AIProvider | undefined,
  modelName: string | undefined,
) {
  if (provider === AIProvider.ANTHROPIC) {
    return anthropic(modelName || ClaudeModel.HAIKU);
  }

  if (provider === AIProvider.GOOGLE) {
    return google(modelName || GeminiModel.FLASH);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function generateTableOfContent(params: {
  sourceText: string;
  language: string;
  chapterCount: number | "Auto";
  userPreference?: string;
  provider: AIProvider;
  model: string;
}) {
  const model = getModel(params.provider, params.model);
  return registry.runSpec(
    "book.toc@v1",
    {
      sourceText: params.sourceText,
      language: params.language,
      minChapters:
        params.chapterCount === "Auto" ? 5 : params.chapterCount || 5,
      maxChapters:
        params.chapterCount === "Auto" ? 10 : params.chapterCount || 10,
      userPreference: params.userPreference || "",
    },
    model,
    "object",
  );
}

export async function generatePlan(params: {
  sourceText: string;
  toc: string[];
  language: string;
  provider: AIProvider;
  model: string;
}) {
  const { sourceText, toc, language, provider, model } = params;
  const languageModel = getModel(provider, model);
  return registry.runSpec(
    "book.plan@v1",
    {
      sourceText,
      toc,
      language,
    },
    languageModel,
    "object",
  );
}

export async function generateChapterOutline(params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  plan: PlanOutput;
  provider: AIProvider;
  model: string;
  language: string;
  userPreference?: string;
}) {
  const {
    toc,
    chapterTitle,
    chapterNumber,
    sourceText,
    plan,
    provider,
    model,
    language,
    userPreference,
  } = params;

  const languageModel = getModel(provider, model);
  return registry.runSpec(
    "book.chapter.outline@v1",
    {
      toc,
      chapterTitle,
      chapterNumber,
      sourceText,
      plan,
      language,
      userPreference,
    },
    languageModel,
    "object",
  );
}

export async function streamSection(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Array<{ title: string; summary: string }>;
  sectionIndex: number;
  previousSections: Array<{ title: string; summary: string }>;
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);

  return registry.runSpec(
    "book.chapter.draft@v1",
    {
      chapterNumber: params.chapterNumber,
      chapterTitle: params.chapterTitle,
      chapterOutline: params.chapterOutline,
      sectionIndex: params.sectionIndex,
      previousSections: params.previousSections,
      plan: params.bookPlan,
      language: params.settings.language || "Korean",
      userPreference: params.settings.userPreference,
    },
    model,
    "stream",
  );
}

export async function streamSectionDev(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Array<{ title: string; summary: string }>;
  sectionIndex: number;
  previousSections: Array<{ title: string; summary: string }>;
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);
  return registry.runSpec(
    "book.chapter.draftDev@v1",
    {
      chapterNumber: params.chapterNumber,
      chapterTitle: params.chapterTitle,
      chapterOutline: params.chapterOutline,
      sectionIndex: params.sectionIndex,
      previousSections: params.previousSections,
      plan: params.bookPlan,
      language: params.settings.language || "Korean",
      userPreference: params.settings.userPreference,
    },
    model,
    "stream",
  );
}

export async function generateSectionDraftText(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Array<{ title: string; summary: string }>;
  sectionIndex: number;
  previousSections: Array<{ title: string; summary: string }>;
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);
  return registry.runSpec(
    "book.chapter.draftText@v1",
    {
      chapterNumber: params.chapterNumber,
      chapterTitle: params.chapterTitle,
      chapterOutline: params.chapterOutline,
      sectionIndex: params.sectionIndex,
      previousSections: params.previousSections,
      plan: params.bookPlan,
      language: params.settings.language || "Korean",
      userPreference: params.settings.userPreference,
    },
    model,
    "text",
  );
}

export async function generateChapterSummary(
  chapterId: string,
  finalText: string,
  settings: GenerationSettings,
) {
  const model = getModel(settings.provider, settings.model);
  return registry.runSpec(
    "book.chapter.summary@v1",
    {
      chapterId,
      finalText,
    },
    model,
    "object",
  );
}

export const ai = {
  generateChapterOutline,
  streamSectionDraft: streamSection,
  streamSectionDraftDev: streamSectionDev,
  generateSectionDraftText,
  generateChapterSummary,
};
