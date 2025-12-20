import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/book/types";

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
}

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  models: ModelConfig[];
}

export const AI_CONFIG: ProviderConfig[] = [
  {
    id: AIProvider.GOOGLE,
    name: "Google",
    models: [
      {
        id: GeminiModel.FLASH,
        name: "Gemini 3 Flash",
        description: "Fast and efficient for most tasks",
      },
      {
        id: GeminiModel.PRO,
        name: "Gemini 3 Pro",
        description: "High quality reasoning and writing",
      },
    ],
  },
  {
    id: AIProvider.ANTHROPIC,
    name: "Anthropic",
    models: [
      {
        id: ClaudeModel.SONNET,
        name: "Claude 4.5 Sonnet",
        description: "Balanced performance and quality",
      },
      {
        id: ClaudeModel.HAIKU,
        name: "Claude 4.5 Haiku",
        description: "Lightweight and fast",
      },
    ],
  },
];

export const DEFAULT_PROVIDER = AIProvider.GOOGLE;
export const DEFAULT_MODEL = GeminiModel.FLASH;

export function getProviderByModel(modelId: string): AIProvider | undefined {
  for (const provider of AI_CONFIG) {
    if (provider.models.some((m) => m.id === modelId)) {
      return provider.id;
    }
  }
  return undefined;
}

export function isValidModel(modelId: string): boolean {
  return AI_CONFIG.some((p) => p.models.some((m) => m.id === modelId));
}

export function getModelConfig(modelId: string): ModelConfig | undefined {
  for (const provider of AI_CONFIG) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return model;
  }
  return undefined;
}
