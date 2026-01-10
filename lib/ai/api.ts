import { AIProvider } from "@/lib/ai/config";
import { getModel } from "@/lib/ai/core";
import { PlanOutput } from "@/lib/ai/schemas/plan";
import { Section } from "@/lib/ai/schemas/outline";
import { GenerationSettings } from "@/lib/ai/types/prompts";
import { generateToc } from "@/lib/ai/prompts/toc";
import { generatePlan as generatePlanPrompt } from "@/lib/ai/prompts/plan";
import { generateOutline } from "@/lib/ai/prompts/outline";
import { streamDraft } from "@/lib/ai/prompts/draft";
import { streamDraftDev } from "@/lib/ai/prompts/draftDev";
import { generateDraftText } from "@/lib/ai/prompts/draftText";
import { generateSummary } from "@/lib/ai/prompts/summary";

export type { GenerationSettings };

export async function generateTableOfContent(params: {
  sourceText: string;
  language: string;
  chapterCount: number | "Auto";
  userPreference?: string;
  provider: AIProvider;
  model: string;
}) {
  const model = getModel(params.provider, params.model);
  return generateToc(
    {
      sourceText: params.sourceText,
      language: params.language,
      minChapters:
        params.chapterCount === "Auto" ? 5 : params.chapterCount || 5,
      maxChapters:
        params.chapterCount === "Auto" ? 10 : params.chapterCount || 10,
      userPreference: params.userPreference,
    },
    model,
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
  return generatePlanPrompt({ sourceText, toc, language }, languageModel);
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
  return generateOutline(
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
  );
}

export function streamSection(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);

  return streamDraft(
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
  );
}

export function streamSectionDev(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);
  return streamDraftDev(
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
  );
}

export async function generateSectionDraftText(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  bookPlan: PlanOutput;
  settings: GenerationSettings;
}) {
  const model = getModel(params.settings.provider, params.settings.model);
  return generateDraftText(
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
  );
}

export async function generateChapterSummary(
  chapterId: string,
  finalText: string,
  settings: GenerationSettings,
) {
  const model = getModel(settings.provider, settings.model);
  return generateSummary({ chapterId, finalText }, model);
}

export const ai = {
  generateChapterOutline,
  streamSectionDraft: streamSection,
  streamSectionDraftDev: streamSectionDev,
  generateSectionDraftText,
  generateChapterSummary,
};
