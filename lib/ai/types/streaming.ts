import { AIProvider } from "@/lib/ai/config";
import { Language } from "@/lib/book/settings";

export type StreamingConfig = {
  bookId: string;
  userId: string;
  title: string;
  tableOfContents: string[];
  sourceText: string;
  provider: AIProvider;
  model: string;
  language: Language;
  userPreference: string;
  startFromChapter?: number;
};

export type ResumeConfig = {
  bookId: string;
  userId: string;
  startFromChapter: number;
};

export type ProgressEvent = {
  phase: string;
  message: string;
};

export type ChapterStartEvent = {
  chapterNumber: number;
  title: string;
  totalSections: number;
};

export type SectionStartEvent = {
  chapterNumber: number;
  sectionIndex: number;
  title: string;
};

export type ChunkEvent = {
  chapterNumber: number;
  sectionIndex: number;
  content: string;
};

export type SectionCompleteEvent = {
  chapterNumber: number;
  sectionIndex: number;
};

export type ChapterCompleteEvent = {
  chapterNumber: number;
  content: string;
};

export type BookCompleteEvent = {
  bookId: string;
  content: string;
};

export type ErrorEvent = {
  message: string;
};

export type SSEEvent =
  | { type: "progress"; data: ProgressEvent }
  | { type: "chapter_start"; data: ChapterStartEvent }
  | { type: "section_start"; data: SectionStartEvent }
  | { type: "chunk"; data: ChunkEvent }
  | { type: "section_complete"; data: SectionCompleteEvent }
  | { type: "chapter_complete"; data: ChapterCompleteEvent }
  | { type: "book_complete"; data: BookCompleteEvent }
  | { type: "error"; data: ErrorEvent };
