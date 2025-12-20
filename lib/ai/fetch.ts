import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/book/types";

export async function fetchTOC(
  sourceText: string,
  provider?: AIProvider,
  model?: GeminiModel | ClaudeModel,
) {
  const response = await fetch("/api/ai/toc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText, provider, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate TOC");
  }

  const data = await response.json();
  return data.toc as string[];
}

export async function* fetchStreamChapter(params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
}) {
  const response = await fetch("/api/ai/chapter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate chapter");
  }

  if (!response.body) throw new Error("No response body");

  const decoder = new TextDecoder();
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    yield decoder.decode(chunk, { stream: true });
  }
}
