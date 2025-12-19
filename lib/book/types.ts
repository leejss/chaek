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
    | "completed";
  selectedModel?: GeminiModel;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export enum GeminiModel {
  FLASH = "gemini-2.5-flash",
  PRO = "gemini-2.5-pro",
}

export type BookDraft = {
  id?: string;
  title?: string;
  createdAt?: string;
  sourceText: string;
  tableOfContents: string[];
  content: string;
  status: Book["status"];
  selectedModel?: GeminiModel;
};

export type BookContextState = {
  books: Book[];
  currentBook: BookDraft;
  streamingContent: string;
  isProcessing: boolean;
  error: string | null;
};

export type BookActions = {
  startNewBook: () => void;
  updateDraft: (draft: Partial<BookDraft>) => void;
  setActiveBook: (book: Book | BookDraft) => void;
  generateTOC: (sourceText: string) => Promise<void>;
  regenerateTOC: () => Promise<void>;
  startBookGeneration: (model?: GeminiModel) => Promise<void>;
  setSelectedModel: (model: GeminiModel) => void;
  getBookById: (id: string) => Book | undefined;
};
