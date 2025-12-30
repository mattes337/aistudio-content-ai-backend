/**
 * AI Service using Vercel AI SDK with Gemini 3
 *
 * This service consolidates AIService.ts and GeminiService.ts
 * and integrates OpenNotebookService as a RAG tool.
 */

import { generateText } from 'ai';
import { loadEnvConfig } from '../../utils/env';
import logger from '../../utils/logger';
import { google, MODELS } from './models';

// Re-export all types
export * from './types';
export { MODELS, selectModel, createModelConfig } from './models';

// Import generators
import { refineContent, generateArticleContent } from './generators/content';

import {
  generateTitle,
  generateSubject,
  generateMetadata,
  generateExcerpt,
  generatePreviewText,
  generatePostDetails,
  generateArticleMetadata,
  generateBulkContent,
  inferMetadata,
} from './generators/metadata';

import { generateImage, editImage } from './generators/image';

// Import agent
import { researchQuery, researchQueryStream, executeTask } from './agent';

// Import streaming
import { refineContentStream, generateArticleContentStream } from './streaming';

// Import tools
export { agentTools, researchTools } from './tools';

const config = loadEnvConfig();

// Validate configuration on load
if (!config.geminiApiKey) {
  logger.warn('GEMINI_API_KEY not configured - AI features will be unavailable');
}

/**
 * AIService - Static service class providing all AI functionality
 *
 * Replaces: AIService.ts, GeminiService.ts
 * Integrates: OpenNotebookService as RAG tool
 */
export class AIService {
  // ============== Content Generation ==============

  static refineContent = refineContent;
  static refineContentStream = refineContentStream;
  static generateArticleContent = generateArticleContent;
  static generateArticleContentStream = generateArticleContentStream;

  // ============== Metadata Generation ==============

  static generateTitle = generateTitle;
  static generateSubject = generateSubject;
  static generateMetadata = generateMetadata;
  static generateExcerpt = generateExcerpt;
  static generatePreviewText = generatePreviewText;
  static generatePostDetails = generatePostDetails;
  static generateBulkContent = generateBulkContent;
  static inferMetadata = inferMetadata;

  // ============== Image Generation ==============

  static generateImage = generateImage;
  static editImage = editImage;

  // ============== Agent/Research ==============

  static researchQuery = researchQuery;
  static researchQueryStream = researchQueryStream;
  static executeTask = executeTask;

  // ============== Legacy Compatibility Methods ==============

  /**
   * Legacy method for backwards compatibility with AIService.generateArticleTitle
   */
  static async generateArticleTitle(content: string): Promise<string> {
    const result = await generateTitle(content);
    return result.title;
  }

  /**
   * Legacy method for backwards compatibility with AIService.generateArticleMetadata
   */
  static generateArticleMetadata = generateArticleMetadata;

  /**
   * Legacy method for AIService.generatePostDetails compatibility
   * Returns { caption, altText, tags } format
   */
  static async generatePostDetailsLegacy(
    prompt: string,
    currentCaption?: string
  ): Promise<{ caption: string; altText: string; tags: string[] }> {
    const result = await generatePostDetails(prompt, currentCaption || '');
    return {
      caption: result.content,
      altText: result.altText,
      tags: result.tags,
    };
  }

  // ============== Health Check ==============

  static async healthCheck(): Promise<boolean> {
    try {
      // Quick test with minimal tokens
      await generateText({
        model: google(MODELS.FLASH),
        prompt: 'Say "ok"',
        maxOutputTokens: 10,
      });
      return true;
    } catch (error) {
      logger.error('AIService health check failed:', error);
      return false;
    }
  }
}

// Default export
export default AIService;
