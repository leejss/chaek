import { Section } from "@/context/types/book";
import { BookSettings } from "@/context/types/settings";
import { PlanOutput } from "@/lib/ai/schemas/plan";
import { authFetch } from "@/lib/api";
import { AIProvider, GeminiModel, ClaudeModel } from "./config";

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
  signal?: AbortSignal;
}) {
  const { settings, signal, ...rest } = params;
  const response = await authFetch("/api/ai/section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...rest,
      language: settings?.language,
      userPreference: settings?.userPreference,
    }),
    signal,
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
