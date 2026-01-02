import { config } from 'dotenv';

config();

/**
 * AI Model configuration for different task types
 */
export interface AIModelConfig {
  /** Fast model for simple tasks (default: gemini-2.5-flash) */
  flash: string;
  /** Pro model for complex reasoning (default: gemini-2.5-pro) */
  pro: string;
  /** Override for research tasks */
  research?: string;
  /** Override for agent/multi-step tasks */
  agent?: string;
  /** Override for content refinement */
  refine?: string;
  /** Override for metadata generation */
  metadata?: string;
  /** Override for image generation */
  image?: string;
  /** Override for bulk content generation */
  bulk?: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  tavilyApiKey: string;
  openNotebookUrl: string;
  openNotebookPassword: string;
  openNotebookEnabled: boolean;
  openNotebookCatchallName: string;
  openNotebookDefaultModel: string;
  logLevel: string;
  fileCleanupDelayHours: number;
  fileCleanupIntervalMinutes: number;
  /** Optional webhook URL for external research processing */
  researchWebhookUrl: string;
  /** AI model configuration */
  aiModels: AIModelConfig;
}

// Default model names
const DEFAULT_MODEL_FLASH = 'gemini-2.5-flash';
const DEFAULT_MODEL_PRO = 'gemini-2.5-pro';

export const loadEnvConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);

  // Load base model names (can be overridden globally)
  const flashModel = process.env.AI_MODEL_FLASH || DEFAULT_MODEL_FLASH;
  const proModel = process.env.AI_MODEL_PRO || DEFAULT_MODEL_PRO;

  // Build AI model config with optional per-task overrides
  const aiModels: AIModelConfig = {
    flash: flashModel,
    pro: proModel,
    // Task-specific overrides (optional)
    research: process.env.AI_MODEL_RESEARCH || undefined,
    agent: process.env.AI_MODEL_AGENT || undefined,
    refine: process.env.AI_MODEL_REFINE || undefined,
    metadata: process.env.AI_MODEL_METADATA || undefined,
    image: process.env.AI_MODEL_IMAGE || undefined,
    bulk: process.env.AI_MODEL_BULK || undefined,
  };

  return {
    nodeEnv,
    port,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/aistudio_content',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    openNotebookUrl: process.env.OPEN_NOTEBOOK_URL || 'http://localhost:5055',
    openNotebookPassword: process.env.OPEN_NOTEBOOK_PASSWORD || '',
    openNotebookEnabled: process.env.OPEN_NOTEBOOK_ENABLED === 'true',
    openNotebookCatchallName: process.env.OPEN_NOTEBOOK_CATCHALL_NAME || 'Research - All Sources',
    openNotebookDefaultModel: process.env.OPEN_NOTEBOOK_DEFAULT_MODEL || 'gemini-2.5-flash-preview-05-20',
    logLevel: process.env.LOG_LEVEL || 'info',
    fileCleanupDelayHours: parseInt(process.env.FILE_CLEANUP_DELAY_HOURS || '24', 10),
    fileCleanupIntervalMinutes: parseInt(process.env.FILE_CLEANUP_INTERVAL_MINUTES || '60', 10),
    researchWebhookUrl: process.env.RESEARCH_WEBHOOK_URL || '',
    aiModels,
  };
};
