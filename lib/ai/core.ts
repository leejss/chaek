import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  type LanguageModel,
  type ModelMessage,
  Output
} from 'ai';
import type { z } from 'zod';
import { getAIProvider, getClaudeModel, getGeminiModel } from '@/lib/ai/config';
import type { AIProvider } from '@/lib/ai/config';
import { aiEnv } from '@/lib/env';

let googleClient: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let anthropicClient: ReturnType<typeof createAnthropic> | null = null;

function getGoogleClient() {
  if (!googleClient) {
    googleClient = createGoogleGenerativeAI({ apiKey: aiEnv.GEMINI_API_KEY });
  }

  return googleClient;
}

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = createAnthropic({ apiKey: aiEnv.ANTHROPIC_API_KEY });
  }

  return anthropicClient;
}

export function getModel(
  provider: AIProvider | undefined,
  modelName: string | undefined
): LanguageModel {
  if (provider === getAIProvider('ANTHROPIC')) {
    return getAnthropicClient()(modelName || getClaudeModel('HAIKU-4.5'));
  }

  if (provider === getAIProvider('GOOGLE')) {
    return getGoogleClient()(modelName || getGeminiModel('FLASH-3'));
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
    output: Output.object({ schema: params.schema })
  });

  return result.output as T;
}

export async function generateText(params: {
  model: LanguageModel;
  messages: ModelMessage[];
}): Promise<string> {
  const result = await aiGenerateText({
    model: params.model,
    messages: params.messages
  });

  return result.text;
}

export function streamText(params: { model: LanguageModel; messages: ModelMessage[] }) {
  return aiStreamText({
    model: params.model,
    messages: params.messages
  });
}

export type { LanguageModel, ModelMessage };
