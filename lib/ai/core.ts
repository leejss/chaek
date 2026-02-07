import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  type LanguageModel,
  type ModelMessage,
  Output,
} from "ai";
import type { z } from "zod";
import type { AIProvider } from "@/lib/ai/config";
import { getAIProvider, getClaudeModel, getGeminiModel } from "@/lib/ai/config";
import { serverEnv } from "@/lib/env";

let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let _anthropic: ReturnType<typeof createAnthropic> | null = null;

function getGoogleClient() {
  if (!_google) {
    _google = createGoogleGenerativeAI({ apiKey: serverEnv.GEMINI_API_KEY });
  }
  return _google;
}

function getAnthropicClient() {
  if (!_anthropic) {
    _anthropic = createAnthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export function getModel(
  provider: AIProvider | undefined,
  modelName: string | undefined,
): LanguageModel {
  if (provider === getAIProvider("ANTHROPIC")) {
    return getAnthropicClient()(modelName || getClaudeModel("HAIKU-4.5"));
  }

  if (provider === getAIProvider("GOOGLE")) {
    return getGoogleClient()(modelName || getGeminiModel("FLASH-3"));
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function generateObject<T>(params: {
  model: LanguageModel;
  messages: ModelMessage[];
  schema: z.ZodType<T>;
}): Promise<T> {
  const result = await aiGenerateText({
    model: params.model,
    messages: params.messages,
    output: Output.object({ schema: params.schema }),
  });

  return result.output as T;
}

export async function generateText(params: {
  model: LanguageModel;
  messages: ModelMessage[];
}): Promise<string> {
  const result = await aiGenerateText({
    model: params.model,
    messages: params.messages,
  });

  return result.text;
}

export function streamText(params: { model: LanguageModel; messages: ModelMessage[] }) {
  return aiStreamText({
    model: params.model,
    messages: params.messages,
  });
}

export type { LanguageModel, ModelMessage };
