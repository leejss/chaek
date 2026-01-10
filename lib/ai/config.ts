export enum GeminiModel {
  FLASH = "gemini-3-flash-preview",
  PRO = "gemini-3-pro-preview",
}

export enum ClaudeModel {
  SONNET = "claude-sonnet-4-5-20250929",
  HAIKU = "claude-haiku-4-5-20251001",
}

export enum AIProvider {
  GOOGLE = "google",
  ANTHROPIC = "anthropic",
}

type ModelConfig = {
  id: string;
  name: string;
  description: string;
};

type ProviderConfig = {
  id: AIProvider;
  name: string;
  models: ModelConfig[];
};

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

export const DEFAULT_PROVIDER = AIProvider.ANTHROPIC;
export const DEFAULT_MODEL = ClaudeModel.HAIKU;

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
