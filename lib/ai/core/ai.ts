import { ChapterCount } from "@/lib/book/settings";
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
  provider?: AIProvider;
  model?: string;
  language?: string;
  chapterCount?: ChapterCount;
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

function getModel(provider: AIProvider | undefined, modelName: string | undefined) {
  if (provider === AIProvider.ANTHROPIC) {
    return anthropic(modelName || ClaudeModel.HAIKU);
  }

  if (provider === AIProvider.GOOGLE) {
    return google(modelName || GeminiModel.FLASH);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

async function generateTOC(sourceText: string, settings: GenerationSettings) {
  const model = getModel(settings.provider, settings.model);
  return registry.runSpec(
    "book.toc@v1",
    {
      sourceText,
      language: settings.language || "Korean",
      minChapters:
        settings.chapterCount === "Auto" ? 5 : settings.chapterCount || 5,
      maxChapters:
        settings.chapterCount === "Auto" ? 10 : settings.chapterCount || 10,
      userPreference: settings.userPreference || "",
    },
    model,
    "object",
  );
}

async function generatePlan(
  sourceText: string,
  toc: string[],
  settings: GenerationSettings,
) {
  const model = getModel(settings.provider, settings.model);
  return registry.runSpec(
    "book.plan@v1",
    {
      sourceText,
      toc,
      language: settings.language || "Korean",
    },
    model,
    "object",
  );
}

async function generateChapterOutline(params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);
  return registry.runSpec(
    "book.chapter.outline@v1",
    {
      ...params,
      language: params.settings.language || "Korean",
    },
    model,
    "object",
  );
}

async function streamSectionDraft(params: {
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

async function streamSectionDraftDev(params: {
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

async function generateSectionDraftText(params: {
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

async function generateChapterSummary(
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
  generateTOC,
  generatePlan,
  generateChapterOutline,
  streamSectionDraft,
  streamSectionDraftDev,
  generateSectionDraftText,
  generateChapterSummary,
};

