import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { loadEnvConfig } from '../../utils/env';
import type { ModelConfig } from './types';

const config = loadEnvConfig();

// Initialize Google Generative AI provider
export const google = createGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
});

// Get model names from centralized config
const { aiModels } = config;

// Model identifiers - loaded from env config with defaults
export const MODELS = {
  FLASH: aiModels.flash,
  PRO: aiModels.pro,
} as const;

/**
 * Get the model name for a specific task.
 * Checks for task-specific override first, then falls back to category default.
 */
function getModelForTask(task: string): string {
  // Check for task-specific overrides
  switch (task) {
    case 'research':
      return aiModels.research || aiModels.pro;
    case 'agent':
      return aiModels.agent || aiModels.pro;
    case 'refine':
    case 'articleContent':
      return aiModels.refine || aiModels.flash;
    case 'title':
    case 'subject':
    case 'excerpt':
    case 'previewText':
    case 'metadata':
    case 'postDetails':
      return aiModels.metadata || aiModels.flash;
    case 'image':
      return aiModels.image || aiModels.flash;
    case 'bulkContent':
      return aiModels.bulk || aiModels.pro;
    default:
      return aiModels.flash;
  }
}

// Task type for model selection
export type ModelTask =
  | 'refine'
  | 'title'
  | 'subject'
  | 'excerpt'
  | 'previewText'
  | 'metadata'
  | 'postDetails'
  | 'articleContent'
  | 'image'
  | 'research'
  | 'bulkContent'
  | 'agent';

// Default configurations per use case (temperature, tokens, thinking)
const TASK_CONFIGS: Record<ModelTask, Omit<ModelConfig, 'model'> & { useProModel?: boolean }> = {
  // Fast operations - use Flash by default
  refine: { temperature: 0.7, maxTokens: 8192 },
  title: { temperature: 0.5, maxTokens: 512 },
  subject: { temperature: 0.5, maxTokens: 512 },
  excerpt: { temperature: 0.6, maxTokens: 512 },
  previewText: { temperature: 0.6, maxTokens: 256 },
  metadata: { temperature: 0.6, maxTokens: 1024 },
  postDetails: { temperature: 0.8, maxTokens: 1024 },
  articleContent: { temperature: 0.7, maxTokens: 8192 },
  image: { temperature: 0.7, maxTokens: 1024 },

  // Complex reasoning - use Pro with thinking by default
  research: { temperature: 0.7, maxTokens: 4096, thinkingLevel: 'low', useProModel: true },
  bulkContent: { temperature: 0.7, maxTokens: 8192, useProModel: true },
  agent: { temperature: 0.7, maxTokens: 4096, thinkingLevel: 'medium', useProModel: true },
};

// Model selection strategy based on task complexity
export function selectModel(task: ModelTask): ModelConfig {
  const taskConfig = TASK_CONFIGS[task];
  if (!taskConfig) {
    // Fallback for unknown tasks
    return { model: aiModels.flash, temperature: 0.7, maxTokens: 8192 };
  }

  const { useProModel, ...configWithoutFlag } = taskConfig;
  return {
    model: getModelForTask(task),
    ...configWithoutFlag,
  };
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
