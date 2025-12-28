import { config } from 'dotenv';

config();

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  openNotebookUrl: string;
  logLevel: string;
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
    openNotebookUrl: process.env.OPEN_NOTEBOOK_URL || 'http://localhost:5055',
    logLevel: process.env.LOG_LEVEL || 'info',
  };
};
