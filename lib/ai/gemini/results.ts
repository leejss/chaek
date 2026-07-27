import type { AiJobUsage } from "@/lib/db/schema";

export type GeminiInteractionSnapshot = {
  id: string;
  status: string;
  output_text?: string;
  usage?: {
    total_cached_tokens?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_thought_tokens?: number;
    total_tool_use_tokens?: number;
    total_tokens?: number;
  };
};

export function normalizeGeminiUsage(
  usage: GeminiInteractionSnapshot["usage"],
): AiJobUsage | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    cachedTokens: usage.total_cached_tokens,
    inputTokens: usage.total_input_tokens,
    outputTokens: usage.total_output_tokens,
    thoughtTokens: usage.total_thought_tokens,
    toolUseTokens: usage.total_tool_use_tokens,
    totalTokens: usage.total_tokens,
  };
}
