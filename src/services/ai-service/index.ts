/**
 * AI Service using Vercel AI SDK with Gemini 3
 *
 * This service provides all AI functionality through a workflow-based architecture.
 * Workflows are registered and can be swapped/extended without changing the API.
 */

import { generateText } from 'ai';
import { loadEnvConfig } from '../../utils/env';
import logger from '../../utils/logger';
import { google, MODELS } from './models';

// Re-export all types
export * from './types';
export { MODELS, selectModel, createModelConfig } from './models';

// Export workflow system
export {
  WorkflowRegistry,
  getResearchWorkflow,
  getMetadataWorkflow,
  getContentWorkflow,
  getImageWorkflow,
  getBulkWorkflow,
  getTaskWorkflow,
  initializeWorkflows,
} from './workflows';

// Import workflow getters for use in service
import {
  getResearchWorkflow,
  getMetadataWorkflow,
  getContentWorkflow,
  getImageWorkflow,
  getBulkWorkflow,
  getTaskWorkflow,
} from './workflows';

// Import types for method signatures
import type {
  AgentQuery,
  AgentResponse,
  ResearchStreamOptions,
  ResearchStreamChunk,
  RefineContentResult,
  TitleResult,
  SubjectResult,
  MetadataResult,
  ExcerptResult,
  PreviewTextResult,
  PostDetailsResult,
  ImageGenerationResult,
  ImageEditResult,
  BulkContentResult,
  ContentType,
  ChatMessage,
  StreamChunk,
  ArticleMetadata,
} from './types';

// Import workflow input types
import type {
  ImageType,
  ImageBounds,
  MetadataOperation,
  MetadataInput,
  MetadataResults,
} from './workflows/types';

// Re-export workflow types for controller use
export type { ImageType, ImageBounds, MetadataOperation, MetadataInput, MetadataResults } from './workflows/types';

// Import tools (for backwards compatibility export)
export { agentTools, researchTools } from './tools';

const config = loadEnvConfig();

// Validate configuration on load
if (!config.geminiApiKey) {
  logger.warn('GEMINI_API_KEY not configured - AI features will be unavailable');
}

/**
 * AIService - Static service class providing all AI functionality
 *
 * Uses the workflow registry to delegate to appropriate workflow implementations.
 * Maintains backwards compatibility with the original API.
 */
export class AIService {
  // ============== Content Generation ==============

  static async refineContent(
    currentContent: string,
    instruction: string,
    type: ContentType,
    history: ChatMessage[] = []
  ): Promise<RefineContentResult> {
    const workflow = getContentWorkflow();
    if (!workflow) throw new Error('No content workflow available');
    return workflow.execute({
      contentType: type,
      instruction,
      currentContent,
      history,
    });
  }

  static async *refineContentStream(
    currentContent: string,
    instruction: string,
    type: ContentType,
    history: ChatMessage[] = []
  ): AsyncGenerator<StreamChunk> {
    const workflow = getContentWorkflow();
    if (!workflow) throw new Error('No content workflow available');
    yield* workflow.executeStream({
      contentType: type,
      instruction,
      currentContent,
      history,
    });
  }

  static async generateArticleContent(prompt: string, currentContent?: string): Promise<string> {
    const workflow = getContentWorkflow();
    if (!workflow) throw new Error('No content workflow available');
    const result = await workflow.execute({
      contentType: 'article',
      instruction: prompt,
      currentContent,
    });
    return result.content;
  }

  static async *generateArticleContentStream(
    prompt: string,
    currentContent?: string
  ): AsyncGenerator<string> {
    const workflow = getContentWorkflow();
    if (!workflow) throw new Error('No content workflow available');
    for await (const chunk of workflow.executeStream({
      contentType: 'article',
      instruction: prompt,
      currentContent,
    })) {
      if (chunk.type === 'delta' && chunk.content) {
        yield chunk.content;
      }
    }
  }

  // ============== Metadata Generation ==============

  static async generateTitle(content: string): Promise<TitleResult> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    const results = await workflow.generate(['title'], { content, contentType: 'article' });
    return results.title;
  }

  static async generateSubject(content: string): Promise<SubjectResult> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    const results = await workflow.generate(['subject'], { content, contentType: 'newsletter' });
    return results.subject;
  }

  static async generateMetadata(content: string, title: string): Promise<MetadataResult> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    const results = await workflow.generate(['seoMetadata'], { content, contentType: 'article', title });
    return results.seoMetadata;
  }

  static async generateExcerpt(content: string): Promise<ExcerptResult> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    const results = await workflow.generate(['excerpt'], { content, contentType: 'article' });
    return results.excerpt;
  }

  static async generatePreviewText(content: string): Promise<PreviewTextResult> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    const results = await workflow.generate(['previewText'], { content, contentType: 'newsletter' });
    return results.previewText;
  }

  static async generatePostDetails(prompt: string, currentCaption: string): Promise<PostDetailsResult> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    const results = await workflow.generate(['postDetails'], {
      content: currentCaption,
      contentType: 'post',
      prompt,
      currentCaption,
    });
    return results.postDetails;
  }

  static async inferMetadata(content: string, type: ContentType): Promise<unknown> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    // Infer all relevant metadata based on content type
    switch (type) {
      case 'article':
        return workflow.generate(['title', 'seoMetadata', 'excerpt'], { content, contentType: type });
      case 'newsletter':
        return workflow.generate(['subject', 'previewText'], { content, contentType: type });
      case 'post':
        return workflow.generate(['postDetails'], { content, contentType: type, prompt: 'Generate post details' });
      default:
        return workflow.generate(['title', 'excerpt'], { content, contentType: type });
    }
  }

  /**
   * Generate specific metadata based on requested operations.
   * Caller specifies exactly which metadata fields they need.
   *
   * @param operations - Array of metadata operations to perform
   * @param input - Input data including content and context
   * @returns Object containing results for each requested operation
   */
  static async generateMetadataByOperations<T extends MetadataOperation>(
    operations: T[],
    input: MetadataInput
  ): Promise<Pick<MetadataResults, T>> {
    const workflow = getMetadataWorkflow();
    if (!workflow) throw new Error('No metadata workflow available');
    return workflow.generate(operations, input);
  }

  static async generateBulkContent(
    articleCount: number,
    postCount: number,
    knowledgeSummary: string
  ): Promise<BulkContentResult> {
    const workflow = getBulkWorkflow();
    if (!workflow) throw new Error('No bulk workflow available');
    return workflow.generateBulkContent(articleCount, postCount, knowledgeSummary);
  }

  // ============== Image Generation ==============

  static async generateImage(
    prompt: string,
    options?: {
      imageType?: ImageType;
      bounds?: ImageBounds;
      aspectRatio?: string; // Legacy support
    }
  ): Promise<ImageGenerationResult> {
    const workflow = getImageWorkflow();
    if (!workflow) throw new Error('No image workflow available');
    return workflow.generate({
      prompt,
      imageType: options?.imageType,
      bounds: options?.bounds ?? (options?.aspectRatio ? { aspectRatio: options.aspectRatio } : undefined),
    });
  }

  static async editImage(
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    options?: {
      imageType?: ImageType;
      bounds?: ImageBounds;
    }
  ): Promise<ImageEditResult> {
    const workflow = getImageWorkflow();
    if (!workflow) throw new Error('No image workflow available');
    return workflow.edit({
      base64ImageData,
      mimeType,
      prompt,
      imageType: options?.imageType,
      bounds: options?.bounds,
    });
  }

  // ============== Agent/Research ==============

  static async researchQuery(request: AgentQuery): Promise<AgentResponse> {
    const workflow = getResearchWorkflow();
    if (!workflow) throw new Error('No research workflow available');
    return workflow.execute(request);
  }

  static async *researchQueryStream(
    request: ResearchStreamOptions
  ): AsyncGenerator<ResearchStreamChunk> {
    const workflow = getResearchWorkflow();
    if (!workflow) throw new Error('No research workflow available');
    yield* workflow.executeStream(request);
  }

  static async executeTask(task: { type: string; params: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const workflow = getTaskWorkflow();
    if (!workflow) throw new Error('No task workflow available');
    return workflow.executeTask(task.type as any, task.params);
  }

  // ============== Legacy Compatibility Methods ==============

  /**
   * Legacy method for backwards compatibility with AIService.generateArticleTitle
   */
  static async generateArticleTitle(content: string): Promise<string> {
    const result = await AIService.generateTitle(content);
    return result.title;
  }

  /**
   * Legacy method for backwards compatibility with AIService.generateArticleMetadata
   */
  static async generateArticleMetadata(content: string): Promise<ArticleMetadata> {
    // Generate title first, then SEO metadata
    const titleResult = await AIService.generateTitle(content);
    const metadataResult = await AIService.generateMetadata(content, titleResult.title);

    // Map to legacy ArticleMetadata format
    return {
      title: metadataResult.seo.title || titleResult.title,
      description: metadataResult.seo.description,
      keywords: metadataResult.seo.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      slug: metadataResult.seo.slug,
    };
  }

  /**
   * Legacy method for AIService.generatePostDetails compatibility
   * Returns { caption, altText, tags } format
   */
  static async generatePostDetailsLegacy(
    prompt: string,
    currentCaption?: string
  ): Promise<{ caption: string; altText: string; tags: string[] }> {
    const result = await AIService.generatePostDetails(prompt, currentCaption || '');
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
