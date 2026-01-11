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

export type BookDraft = {
  id?: string;
  title?: string;
  createdAt?: string;
  sourceText: string;
  tableOfContents: string[];
  content: string;
};

export type Step = "settings" | "source_input" | "toc_review";

export type LoadingState = "idle" | "generating_toc" | "generating" | "error";

export type FlowStatus =
  | "settings"
  | "source_input"
  | "generating_toc"
  | "toc_review"
  | "generating"
  | "completed";

export type BookState = {
  sourceText: string;
  bookTitle: string;
  tableOfContents: string[];
  loadingState: LoadingState;
  error: string | null;
  completedSteps: Set<Step>;
};
