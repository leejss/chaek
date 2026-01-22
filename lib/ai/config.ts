const geminiModel = {
  "FLASH-3": "gemini-3-flash-preview",
  "PRO-3": "gemini-3-pro-preview",
} as const;

export type GeminiModel = (typeof geminiModel)[keyof typeof geminiModel];

export function getGeminiModel(name: keyof typeof geminiModel): GeminiModel {
  if (name in geminiModel) {
    return geminiModel[name];
  }

  throw new Error(`Unknown Gemini model name: ${name}`);
}

const claudeModel = {
  "SONNET-4.5": "claude-sonnet-4-5-20250929",
  "HAIKU-4.5": "claude-haiku-4-5-20251001",
} as const;

export type ClaudeModel = (typeof claudeModel)[keyof typeof claudeModel];

export function getClaudeModel(name: keyof typeof claudeModel): ClaudeModel {
  if (name in claudeModel) {
    return claudeModel[name];
  }

  throw new Error(`Unknown Claude model name: ${name}`);
}

const aiProvider = {
  GOOGLE: "google",
  ANTHROPIC: "anthropic",
} as const;

export function getAIProvider(name: keyof typeof aiProvider): AIProvider {
  if (name in aiProvider) {
    return aiProvider[name];
  }

  throw new Error(`Unknown AI provider name: ${name}`);
}

export type AIProvider = (typeof aiProvider)[keyof typeof aiProvider];

export const AI_CONFIG = [
  {
    id: getAIProvider("GOOGLE"),
    name: "Google",
    models: [
      {
        id: getGeminiModel("FLASH-3"),
        name: "Gemini 3 Flash",
        description: "Fast and efficient for most tasks",
      },
      {
        id: getGeminiModel("PRO-3"),
        name: "Gemini 3 Pro",
        description: "High quality reasoning and writing",
      },
    ],
  },
  {
    id: getAIProvider("ANTHROPIC"),
    name: "Anthropic",
    models: [
      {
        id: getClaudeModel("SONNET-4.5"),
        name: "Claude 4.5 Sonnet",
        description: "Balanced performance and quality",
      },
      {
        id: getClaudeModel("HAIKU-4.5"),
        name: "Claude 4.5 Haiku",
        description: "Lightweight and fast",
      },
    ],
  },
];

export function getDefaultConfig() {
  const DEFAULT_PROVIDER = getAIProvider("ANTHROPIC");
  const DEFAULT_MODEL = getClaudeModel("HAIKU-4.5");
  return {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL,
  };
}

// TODO: delete it
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
