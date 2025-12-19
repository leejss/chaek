import { GoogleGenAI, Type } from "@google/genai";
import { GeminiModel } from "@/lib/book/types";

import { env } from "@/lib/env";

const apiKey = env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const generateTableOfContents = async (
  sourceText: string,
): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: GeminiModel.FLASH,
    contents: `You are an expert book editor. Create a compelling Table of Contents (list of chapter titles) based on the following source text.
      
      SOURCE TEXT:
      ${sourceText}
      
      Return ONLY a JSON array of strings, where each string is a chapter title. Do not include "Chapter 1" prefixes unless necessary for context.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
      },
    },
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
  const prompt = `
    You are a professional author. Write a book based on the provided Table of Contents and Source Text.
    
    TABLE OF CONTENTS:
    ${toc.map((t, i) => `${i + 1}. ${t}`).join("\n")}
    
    SOURCE MATERIAL:
    ${sourceText}
    
    INSTRUCTIONS:
    - Write in Markdown format.
    - Use headers (# for Title, ## for Chapter Titles).
    - Write the content for EVERY chapter listed in the TOC.
    - Ensure a cohesive narrative flow.
    - Do not stop until the book is complete.
    - Use an elegant, sophisticated tone.
    `;

  const streamResponse = await ai.models.generateContentStream({
    model,
    contents: prompt,
  });

  for await (const chunk of streamResponse) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
