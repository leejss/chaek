import { ChapterOutline } from "./book";

export type GenerationPhase =
  | "idle"
  | "deducting_credits"
  | "planning"
  | "outlining"
  | "generating_sections"
  | "review"
  | "completed"
  | "error";

export type GenerationProgress = {
  phase: GenerationPhase;
  currentChapter?: number;
  totalChapters?: number;
  currentSection?: number;
  totalSections?: number;
  currentOutline?: ChapterOutline;
  error?: string | null;
};

export type ChapterContent = {
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  isComplete: boolean;
  outline?: ChapterOutline;
};
