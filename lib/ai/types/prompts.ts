import type { AIProvider } from "@/lib/ai/config";
import type { Section } from "@/lib/ai/schemas/outline";
import type { PlanOutput } from "@/lib/ai/schemas/plan";

export interface GenerationSettings {
  provider: AIProvider;
  model: string;
  language: string;
  chapterCount?: number | "Auto";
  userPreference?: string;
}

export type TocInput = {
  sourceText: string;
  language: string;
  minChapters: number;
  maxChapters: number;
  userPreference?: string;
};

export type PlanInput = {
  sourceText: string;
  toc: string[];
  language: string;
};

export type OutlineInput = {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  plan?: PlanOutput;
  language: string;
  userPreference?: string;
};

export type DraftInput = {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  language: string;
  userPreference?: string;
  plan: PlanOutput;
};

export type SummaryInput = {
  chapterId: string;
  finalText: string;
};
