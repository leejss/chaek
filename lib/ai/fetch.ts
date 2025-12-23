import {
  AIProvider,
  ChapterOutline,
  ClaudeModel,
  GeminiModel,
  Section,
} from "@/lib/book/types";
import { BookSettings } from "@/lib/book/settings";

export async function fetchTOC(
  sourceText: string,
  provider?: AIProvider,
  model?: GeminiModel | ClaudeModel,
  settings?: BookSettings,
) {
  const response = await fetch("/api/ai/toc", {
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
  return data.toc as string[];
}

export async function fetchPlan(
  sourceText: string,
  toc: string[],
  provider?: AIProvider,
  model?: GeminiModel | ClaudeModel,
  settings?: BookSettings,
) {
  const response = await fetch("/api/ai/plan", {
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
  return data.plan;
}

export async function fetchOutline(params: {
  toc: string[];
  chapterNumber: number;
  sourceText: string;
  bookPlan?: any;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}): Promise<ChapterOutline> {
  const { settings, ...rest } = params;
  const response = await fetch("/api/ai/outline", {
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

export async function* fetchStreamSection(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  toc: string[];
  sourceText: string;
  bookPlan?: any;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  settings?: BookSettings;
}) {
  const { settings, ...rest } = params;
  const response = await fetch("/api/ai/section", {
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
