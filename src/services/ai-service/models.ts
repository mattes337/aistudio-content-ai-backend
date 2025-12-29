import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { loadEnvConfig } from '../../utils/env';
import type { GeminiModel, ModelConfig } from './types';

const config = loadEnvConfig();

// Initialize Google Generative AI provider
export const google = createGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
});

// Model identifiers for Gemini
// Using 2.5 stable versions (gemini-3 is still in preview)
export const MODELS = {
  FLASH: 'gemini-2.5-flash' as const,
  PRO: 'gemini-2.5-pro' as const,
} as const;

// Default configurations per use case
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Fast operations - use Flash
  refine: { model: MODELS.FLASH, temperature: 0.7, maxTokens: 8192 },
  title: { model: MODELS.FLASH, temperature: 0.5, maxTokens: 512 },  // Lower temp for more reliable structured output
  subject: { model: MODELS.FLASH, temperature: 0.5, maxTokens: 512 }, // Lower temp for more reliable structured output
  excerpt: { model: MODELS.FLASH, temperature: 0.6, maxTokens: 512 },
  previewText: { model: MODELS.FLASH, temperature: 0.6, maxTokens: 256 },
  metadata: { model: MODELS.FLASH, temperature: 0.6, maxTokens: 1024 },
  postDetails: { model: MODELS.FLASH, temperature: 0.8, maxTokens: 1024 },
  articleContent: { model: MODELS.FLASH, temperature: 0.7, maxTokens: 8192 },
  image: { model: MODELS.FLASH, temperature: 0.7, maxTokens: 1024 },

  // Complex reasoning - use Pro with thinking
  research: { model: MODELS.PRO, temperature: 0.7, maxTokens: 4096, thinkingLevel: 'low' },
  bulkContent: { model: MODELS.PRO, temperature: 0.7, maxTokens: 8192 },
  agent: { model: MODELS.PRO, temperature: 0.7, maxTokens: 4096, thinkingLevel: 'medium' },
};

// Default configuration (used as fallback)
const DEFAULT_CONFIG: ModelConfig = { model: MODELS.FLASH, temperature: 0.7, maxTokens: 8192 };

// Model selection strategy based on task complexity
export function selectModel(task: keyof typeof MODEL_CONFIGS): ModelConfig {
  return MODEL_CONFIGS[task] ?? DEFAULT_CONFIG;
}

// Create model instance with configuration
export function createModelConfig(config: ModelConfig) {
  const providerOptions = config.thinkingLevel
    ? {
        google: {
          thinkingConfig: {
            thinkingBudget: getThinkingBudget(config.thinkingLevel),
          },
        },
      }
    : undefined;

  return {
    model: google(config.model),
    temperature: config.temperature,
    maxTokens: config.maxTokens, // Note: Some APIs use maxOutputTokens
    providerOptions,
  };
}

// Map thinking level to token budget
function getThinkingBudget(level: string): number {
  switch (level) {
    case 'minimal':
      return 1024;
    case 'low':
      return 4096;
    case 'medium':
      return 8192;
    case 'high':
      return 16384;
    default:
      return 4096;
  }
}
