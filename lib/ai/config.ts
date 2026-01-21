export const geminiModel = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3-pro-preview",
} as const;

export type GeminiModel = (typeof geminiModel)[keyof typeof geminiModel];

export const claudeModel = {
  SONNET: "claude-sonnet-4-5-20250929",
  HAIKU: "claude-haiku-4-5-20251001",
} as const;

export type ClaudeModel = (typeof claudeModel)[keyof typeof claudeModel];

export const aiProvider = {
  GOOGLE: "google",
  ANTHROPIC: "anthropic",
} as const;

export type AIProvider = (typeof aiProvider)[keyof typeof aiProvider];

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
    id: aiProvider.GOOGLE,
    name: "Google",
    models: [
      {
        id: geminiModel.FLASH,
        name: "Gemini 3 Flash",
        description: "Fast and efficient for most tasks",
      },
      {
        id: geminiModel.PRO,
        name: "Gemini 3 Pro",
        description: "High quality reasoning and writing",
      },
    ],
  },
  {
    id: aiProvider.ANTHROPIC,
    name: "Anthropic",
    models: [
      {
        id: claudeModel.SONNET,
        name: "Claude 4.5 Sonnet",
        description: "Balanced performance and quality",
      },
      {
        id: claudeModel.HAIKU,
        name: "Claude 4.5 Haiku",
        description: "Lightweight and fast",
      },
    ],
  },
];

export const DEFAULT_PROVIDER = aiProvider.ANTHROPIC;
export const DEFAULT_MODEL = claudeModel.HAIKU;

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
