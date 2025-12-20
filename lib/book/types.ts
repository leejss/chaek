export interface Book {
  id: string;
  title: string;
  createdAt: string;
  sourceText?: string;
  tableOfContents: string[];
  content: string;
  status:
    | "draft"
    | "generating_toc"
    | "toc_review"
    | "generating_book"
    | "chapter_review"
    | "completed";
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

export type BookDraft = {
  id?: string;
  title?: string;
  createdAt?: string;
  sourceText: string;
  tableOfContents: string[];
  content: string;
  status: Book["status"];
  selectedProvider?: AIProvider;
  selectedModel?: GeminiModel | ClaudeModel;
};

export type BookContextState = {
  books: Book[];
  currentBook: BookDraft;
  streamingContent: string;
  currentChapterIndex: number | null;
  currentChapterContent: string;
  awaitingChapterDecision: boolean;
  isProcessing: boolean;
  error: string | null;
};

export type BookActions = {
  startNewBook: () => void;
  updateDraft: (draft: Partial<BookDraft>) => void;
  setActiveBook: (book: Book | BookDraft) => void;
  generateTOC: (sourceText: string) => Promise<void>;
  regenerateTOC: () => Promise<void>;
  startBookGeneration: (
    provider?: AIProvider,
    model?: GeminiModel | ClaudeModel,
  ) => Promise<void>;
  confirmChapter: () => void;
  cancelGeneration: () => void;
  setSelectedModel: (
    provider: AIProvider,
    model: GeminiModel | ClaudeModel,
  ) => void;
  getBookById: (id: string) => Book | undefined;
};
