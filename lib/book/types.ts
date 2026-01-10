import { PlanOutput } from "@/lib/ai/specs/plan";

export interface Section {
  title: string;
  summary: string;
}

export interface ChapterOutline {
  chapterNumber: number;
  chapterTitle: string;
  sections: Section[];
}

export interface GeneratedChapter {
  chapterNumber: number;
  chapterTitle: string;
  sections: Section[];
  finalContent: string;
}

export interface Book {
  id: string;
  title: string;
  createdAt: string;
  sourceText?: string;
  tableOfContents: string[];
  outlines?: ChapterOutline[];
  chapters?: GeneratedChapter[];
  content: string;
  status?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export type FlowStatus =
  | "settings"
  | "source_input"
  | "generating_toc"
  | "toc_review"
  | "generating"
  | "completed";

export type BookDraft = {
  id?: string;
  title?: string;
  createdAt?: string;
  sourceText: string;
  tableOfContents: string[];
  content: string;
};

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
};

export type StreamingStatus = {
  lastStreamedChapter: number | null;
  lastStreamedSection: number | null;
  lastUpdated: string;
};

export type BookWorkflowState = {
  sourceText: string;
  bookTitle: string;
  tableOfContents: string[];
  aiConfiguration: AIConfiguration;
  flowStatus: FlowStatus;
  isProcessing: boolean;
  error: string | null;
  completedSteps: Set<FlowStatus>;
};

export type BookContextState = BookWorkflowState & {
  savedBookId: string | null;
  isSavingBook: boolean;
};

export type GenerationState = {
  content: string;
  bookPlan?: PlanOutput;
  chapters: ChapterContent[];
  viewingChapterIndex: number;
  streamingContent: string;
  currentChapterIndex: number | null;
  currentChapterContent: string;
  awaitingChapterDecision: boolean;
  generationProgress: GenerationProgress;
  bookGenerationStarted: boolean;
  generationCancelled: boolean;
};
