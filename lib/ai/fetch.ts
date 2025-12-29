import {
  AIProvider,
  Book,
  ChapterOutline,
  ClaudeModel,
  GeminiModel,
  Section,
} from "@/lib/book/types";
import { BookSettings } from "@/lib/book/settings";
import { PlanOutput, PlanSchema } from "@/lib/ai/specs/plan";
import { authFetch } from "@/lib/api";

type SaveBookParams = {
  title: string;
  content: string;
  tableOfContents: string[];
  sourceText?: string;
};

export type TocResponse = {
  title: string;
  toc: string[];
};

export async function fetchTOC(
  sourceText: string,
  provider?: AIProvider,
  model?: GeminiModel | ClaudeModel,
  settings?: BookSettings,
): Promise<TocResponse> {
  const response = await authFetch("/api/ai/toc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceText,
      provider,
      model,
      language: settings?.language,
      chapterCount: settings?.chapterCount,
      userPreference: settings?.userPreference,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate TOC");
  }

  const data = await response.json();
  return { title: data.title, toc: data.toc };
}

export async function fetchPlan(
  sourceText: string,
  toc: string[],
  provider?: AIProvider,
  model?: GeminiModel | ClaudeModel,
  settings?: BookSettings,
): Promise<PlanOutput> {
  const response = await authFetch("/api/ai/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceText,
      toc,
      provider,
      model,
      language: settings?.language,
      userPreference: settings?.userPreference,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate Plan");
  }

  const data = await response.json();
  return PlanSchema.parse(data.plan);
}

export async function fetchOutline(params: {
  toc: string[];
  chapterNumber: number;
  sourceText: string;
  bookPlan?: PlanOutput;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}): Promise<ChapterOutline> {
  const { settings, ...rest } = params;
  const response = await authFetch("/api/ai/outline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...rest,
      language: settings?.language,
      userPreference: settings?.userPreference,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate outline");
  }

  const data = await response.json();
  return data.outline as ChapterOutline;
}

export async function saveBookRequest(params: SaveBookParams) {
  const response = await authFetch("/api/book/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    bookId?: string;
    error?: string;
  };
  if (!response.ok || !data.ok || !data.bookId) {
    throw new Error(data.error || "Failed to save book");
  }

  return data.bookId;
}

export async function* fetchStreamSection(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  toc: string[];
  sourceText: string;
  bookPlan?: PlanOutput;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}) {
  const { settings, ...rest } = params;
  const response = await authFetch("/api/ai/section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...rest,
      language: settings?.language,
      userPreference: settings?.userPreference,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate section");
  }

  if (!response.body) throw new Error("No response body");

  const decoder = new TextDecoder();
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    yield decoder.decode(chunk, { stream: true });
  }
}

export async function fetchBooks(): Promise<Book[]> {
  const response = await authFetch("/api/books");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch books");
  }

  const data = await response.json();
  return data.books as Book[];
}

export async function fetchBookById(id: string): Promise<Book> {
  const response = await authFetch(`/api/books/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Book not found");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch book");
  }

  const data = await response.json();
  return data.book as Book;
}
