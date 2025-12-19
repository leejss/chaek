import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

import { GeminiModel } from "@/lib/book/types";
import {
  bookSystemInstruction,
  bookUserContents,
  tocResponseConfig,
  tocSystemInstruction,
  tocUserContents,
} from "@/lib/ai/instructions";

export const gemini = new GoogleGenAI({
  apiKey: env.NEXT_PUBLIC_GEMINI_API_KEY,
});

export const generateTableOfContents = async (
  sourceText: string,
): Promise<string[]> => {
  const response = await gemini.models.generateContent({
    model: GeminiModel.FLASH,
    config: {
      systemInstruction: tocSystemInstruction(),
      ...tocResponseConfig,
    },
    contents: tocUserContents(sourceText),
  });

  const jsonStr = response.text;
  if (!jsonStr) throw new Error("No content generated");

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) {
    throw new Error("Invalid TOC format");
  }
  return parsed as string[];
};

export async function* streamBookGeneration(
  toc: string[],
  sourceText: string,
  model: GeminiModel,
): AsyncGenerator<string, void, unknown> {
  const streamResponse = await gemini.models.generateContentStream({
    model,
    config: {
      systemInstruction: bookSystemInstruction(),
    },
    contents: bookUserContents(toc, sourceText),
  });

  for await (const chunk of streamResponse) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
