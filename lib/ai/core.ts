import { aiProvider, claudeModel, geminiModel } from "@/lib/ai/config";
import type { AIProvider } from "@/lib/ai/config";
import { serverEnv } from "@/lib/env";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  Output,
  LanguageModel,
  ModelMessage,
} from "ai";
import { z } from "zod";

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
  if (provider === aiProvider.ANTHROPIC) {
    return getAnthropicClient()(modelName || claudeModel.HAIKU);
  }

  if (provider === aiProvider.GOOGLE) {
    return getGoogleClient()(modelName || geminiModel.FLASH);
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

export function streamText(params: {
  model: LanguageModel;
  messages: ModelMessage[];
}) {
  return aiStreamText({
    model: params.model,
    messages: params.messages,
  });
}

export type { LanguageModel, ModelMessage };
