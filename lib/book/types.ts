export interface Section {
  title: string;
  summary: string;
  content?: string;
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
  selectedProvider?: AIProvider;
  selectedModel?: GeminiModel | ClaudeModel;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export enum GeminiModel {
  FLASH = "gemini-3-flash-preview",
  PRO = "gemini-3-pro-preview",
}

export enum ClaudeModel {
  SONNET = "claude-sonnet-4-5-20250929",
  HAIKU = "claude-haiku-4-5-20251001",
}

export enum AIProvider {
  GOOGLE = "google",
  ANTHROPIC = "anthropic",
}

export type FlowStatus =
  | "settings"
  | "draft"
  | "generating_toc"
  | "toc_review"
  | "generating_outlines"
  | "generating_sections"
  | "generating_book"
  | "chapter_review"
  | "completed";

export type BookDraft = {
  id?: string;
  title?: string;
  createdAt?: string;
  sourceText: string;
  tableOfContents: string[];
  content: string;
  selectedProvider?: AIProvider;
  selectedModel?: GeminiModel | ClaudeModel;
};

export type GenerationPhase =
  | "idle"
  | "outline"
  | "sections"
  | "refinement"
  | "review";

export type GenerationProgress = {
  phase: GenerationPhase;
  currentSection?: number;
  totalSections?: number;
  currentOutline?: ChapterOutline;
};

export type ChapterContent = {
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  isComplete: boolean;
};

export type BookContextState = {
  books: Book[];
  currentBook: BookDraft;
  flowStatus: FlowStatus;
  chapters: ChapterContent[];
  viewingChapterIndex: number;
  streamingContent: string;
  currentChapterIndex: number | null;
  currentChapterContent: string;
  awaitingChapterDecision: boolean;
  isProcessing: boolean;
  error: string | null;
  generationProgress: GenerationProgress;
};

export type BookActions = {
  startNewBook: () => void;
  updateDraft: (draft: Partial<BookDraft>) => void;
  setActiveBook: (book: Book | BookDraft) => void;
  generateTOC: (sourceText: string) => Promise<void>;
  regenerateTOC: () => Promise<void>;
  startBookGeneration: (
    provider: AIProvider,
    model: GeminiModel | ClaudeModel,
  ) => Promise<void>;
  confirmChapter: () => void;
  cancelGeneration: () => void;
  setSelectedModel: (
    provider: AIProvider,
    model: GeminiModel | ClaudeModel,
  ) => void;
  getBookById: (id: string) => Book | undefined;
  goToChapter: (index: number) => void;
  goToPrevChapter: () => void;
  goToNextChapter: () => void;
};
