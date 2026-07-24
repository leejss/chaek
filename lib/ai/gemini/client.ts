import "server-only";

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | undefined;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  geminiClient ??= new GoogleGenAI({ apiKey });

  return geminiClient;
}
