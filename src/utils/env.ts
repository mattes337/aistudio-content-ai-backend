import { config } from 'dotenv';

config();

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
}

export const loadEnvConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);

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
  };
};
