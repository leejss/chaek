import {
  AIProvider,
  Book,
  ClaudeModel,
  GeminiModel,
  Section,
} from "@/lib/book/types";
import { BookSettings } from "@/lib/book/settings";
import { PlanOutput } from "@/lib/ai/specs/plan";
import { authFetch } from "@/lib/api";

import { z } from "zod";

const TocResponseSchema = z.object({
  data: z.object({
    title: z.string(),
    chapters: z.array(z.string()),
  }),
});

export type TocResponse = z.infer<typeof TocResponseSchema>;

export async function fetchTableOfContent(
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

  const result = await response.json();
  return TocResponseSchema.parse(result);
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
