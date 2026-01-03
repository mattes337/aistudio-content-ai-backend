import type { Request, Response } from 'express';
import { AIService } from '../services/ai-service';
import type { MetadataOperation, ContentType } from '../services/ai-service';
import { OpenNotebookService } from '../services/OpenNotebookService';
import { DatabaseService } from '../services/DatabaseService';
import { loadEnvConfig } from '../utils/env';
import logger from '../utils/logger';

// Valid metadata operations for validation
const VALID_METADATA_OPERATIONS: MetadataOperation[] = [
  'title',
  'subject',
  'seoMetadata',
  'excerpt',
  'previewText',
  'postDetails',
];

const config = loadEnvConfig();

// Cache for channel ID -> notebook ID mappings
const channelNotebookCache = new Map<string, { notebookId: string | undefined; timestamp: number }>();
const CHANNEL_NOTEBOOK_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Cache for catchall notebook ID
let catchallNotebookCache: { notebookId: string | undefined; timestamp: number } | null = null;

/**
 * Helper to resolve notebook ID based on channelId
 * - If channelId is provided, tries to find a notebook matching the channel name
 * - Falls back to catchall notebook
 * - Results are cached for performance
 */
async function resolveNotebookId(channelId?: string): Promise<string | undefined> {
  const now = Date.now();

  // If channelId is provided, try to find a channel-specific notebook
  if (channelId) {
    // Check cache first
    const cached = channelNotebookCache.get(channelId);
    if (cached && (now - cached.timestamp) < CHANNEL_NOTEBOOK_CACHE_TTL) {
      logger.debug(`Using cached notebook for channel ${channelId}: ${cached.notebookId}`);
      return cached.notebookId ?? await getCatchallNotebookId(now);
    }

    try {
      const channel = await DatabaseService.getChannelById(channelId);
      if (channel) {
        logger.info(`Looking up notebook for channel: "${channel.name}"`);
        const channelNotebook = await OpenNotebookService.findNotebookByName(channel.name);
        if (channelNotebook) {
          logger.info(`Found channel notebook: id=${channelNotebook.id}, name="${channelNotebook.name}"`);
          // Cache the result
          channelNotebookCache.set(channelId, { notebookId: channelNotebook.id, timestamp: now });
          return channelNotebook.id;
        }
        logger.info(`No notebook found matching channel name "${channel.name}", falling back to catchall`);
        // Cache that this channel has no specific notebook (will use catchall)
        channelNotebookCache.set(channelId, { notebookId: undefined, timestamp: now });
      }
    } catch (err) {
      logger.warn('Failed to look up channel notebook:', err);
    }
  }

  // Fall back to catchall notebook
  return getCatchallNotebookId(now);
}

/**
 * Get catchall notebook ID with caching
 */
async function getCatchallNotebookId(now: number): Promise<string | undefined> {
  // Check cache
  if (catchallNotebookCache && (now - catchallNotebookCache.timestamp) < CHANNEL_NOTEBOOK_CACHE_TTL) {
    logger.debug(`Using cached catchall notebook: ${catchallNotebookCache.notebookId}`);
    return catchallNotebookCache.notebookId;
  }

  try {
    const catchallNotebook = await OpenNotebookService.findNotebookByName(
      config.openNotebookCatchallName
    );
    if (catchallNotebook) {
      logger.info(`Using catchall notebook: id=${catchallNotebook.id}, name="${catchallNotebook.name}"`);
      catchallNotebookCache = { notebookId: catchallNotebook.id, timestamp: now };
      return catchallNotebook.id;
    }
    logger.warn(`Catchall notebook "${config.openNotebookCatchallName}" not found`);
    catchallNotebookCache = { notebookId: undefined, timestamp: now };
  } catch (err) {
    logger.warn('Failed to look up catchall notebook:', err);
  }

  return undefined;
}

export class AIController {
  // ============== Legacy Endpoints (kept for backwards compatibility) ==============

  static async generateArticle(req: Request, res: Response) {
    try {
      const { prompt, currentContent } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      const content = await AIService.generateArticleContent(prompt, currentContent);
      res.json({ content });
    } catch (error) {
      logger.error('Error generating article:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateImage(req: Request, res: Response) {
    try {
      const { prompt, aspectRatio } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      const imageData = await AIService.generateImage(prompt, aspectRatio);
      res.json(imageData);
    } catch (error) {
      logger.error('Error generating image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async editImage(req: Request, res: Response) {
    try {
      const { prompt, base64ImageData, mimeType } = req.body;
      if (!prompt || !base64ImageData || !mimeType) {
        return res.status(400).json({ message: 'Prompt, image data, and mime type are required' });
      }
      const imageData = await AIService.editImage(base64ImageData, mimeType, prompt);
      res.json(imageData);
    } catch (error) {
      logger.error('Error editing image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateBulk(req: Request, res: Response) {
    try {
      const { articleCount, postCount, knowledgeSummary } = req.body;
      if (!articleCount || !postCount || !knowledgeSummary) {
        return res.status(400).json({ message: 'Article count, post count, and knowledge summary are required' });
      }
      const result = await AIService.generateBulkContent(articleCount, postCount, knowledgeSummary);
      res.json(result);
    } catch (error) {
      logger.error('Error generating bulk content:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ============== New Gemini Endpoints ==============

  static async refineContent(req: Request, res: Response) {
    try {
      const { currentContent, instruction, type, history } = req.body;
      if (!instruction) {
        return res.status(400).json({ message: 'Instruction is required' });
      }
      if (!type || !['article', 'post', 'newsletter'].includes(type)) {
        return res.status(400).json({ message: 'Valid type (article, post, newsletter) is required' });
      }

      const result = await AIService.refineContent(currentContent || '', instruction, type, history || []);
      res.json(result);
    } catch (error) {
      logger.error('Error refining content:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async refineContentStream(req: Request, res: Response) {
    try {
      const { currentContent, instruction, type, history } = req.body;
      if (!instruction) {
        return res.status(400).json({ message: 'Instruction is required' });
      }
      if (!type || !['article', 'post', 'newsletter'].includes(type)) {
        return res.status(400).json({ message: 'Valid type (article, post, newsletter) is required' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of AIService.refineContentStream(currentContent || '', instruction, type, history || [])) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.end();
    } catch (error) {
      logger.error('Error streaming refine content:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Generate image with optional type and bounds.
   *
   * POST /api/ai/image/generate
   * Body: {
   *   prompt: string,
   *   imageType?: 'photo' | 'illustration' | 'icon' | 'diagram' | 'art' | 'other',
   *   bounds?: { width?: number, height?: number, aspectRatio?: string },
   *   aspectRatio?: string  // Legacy support, use bounds.aspectRatio instead
   * }
   */
  static async generateImageNew(req: Request, res: Response) {
    try {
      const { prompt, imageType, bounds, aspectRatio, model, quality, systemPrompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }

      // Validate imageType if provided
      const validImageTypes = ['photo', 'illustration', 'icon', 'diagram', 'art', 'other'];
      if (imageType && !validImageTypes.includes(imageType)) {
        return res.status(400).json({
          message: `Invalid imageType. Valid types: ${validImageTypes.join(', ')}`,
        });
      }

      // Validate quality if provided
      const validQualities = ['auto', 'low', 'medium', 'high'];
      if (quality && !validQualities.includes(quality)) {
        return res.status(400).json({
          message: `Invalid quality. Valid values: ${validQualities.join(', ')}`,
        });
      }

      const result = await AIService.generateImage(prompt, {
        imageType,
        bounds,
        aspectRatio, // Legacy support
        model,
        quality,
        systemPrompt,
      });
      res.json(result);
    } catch (error) {
      logger.error('Error generating image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Edit existing image with optional type and bounds.
   *
   * POST /api/ai/image/edit
   * Body: {
   *   base64ImageData: string,
   *   mimeType: string,
   *   prompt: string,
   *   imageType?: 'photo' | 'illustration' | 'icon' | 'diagram' | 'art' | 'other',
   *   bounds?: { width?: number, height?: number, aspectRatio?: string }
   * }
   */
  static async editImageNew(req: Request, res: Response) {
    try {
      const { base64ImageData, mimeType, prompt, imageType, bounds, model, quality } = req.body;
      if (!base64ImageData || !mimeType || !prompt) {
        return res.status(400).json({ message: 'Base64 image data, mime type, and prompt are required' });
      }

      // Validate imageType if provided
      const validImageTypes = ['photo', 'illustration', 'icon', 'diagram', 'art', 'other'];
      if (imageType && !validImageTypes.includes(imageType)) {
        return res.status(400).json({
          message: `Invalid imageType. Valid types: ${validImageTypes.join(', ')}`,
        });
      }

      // Validate quality if provided
      const validQualities = ['auto', 'low', 'medium', 'high'];
      if (quality && !validQualities.includes(quality)) {
        return res.status(400).json({
          message: `Invalid quality. Valid values: ${validQualities.join(', ')}`,
        });
      }

      const result = await AIService.editImage(base64ImageData, mimeType, prompt, {
        imageType,
        bounds,
        model,
        quality,
      });
      res.json(result);
    } catch (error) {
      logger.error('Error editing image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Get available image generation models.
   *
   * GET /api/ai/image/models
   */
  static async getImageModels(_req: Request, res: Response) {
    try {
      const models = await AIService.getImageModels();
      res.json({
        models,
        qualityOptions: ['auto', 'low', 'medium', 'high'],
      });
    } catch (error) {
      logger.error('Error fetching image models:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Unified metadata generation endpoint.
   * Caller specifies which metadata operations to perform.
   *
   * POST /api/ai/metadata
   * Body: {
   *   operations: ['title', 'excerpt', 'seoMetadata', ...],
   *   content: string,
   *   contentType: 'article' | 'post' | 'newsletter',
   *   title?: string,        // Required for seoMetadata
   *   prompt?: string,       // For postDetails
   *   currentCaption?: string // For postDetails
   * }
   */
  static async generateMetadataByOperations(req: Request, res: Response) {
    try {
      const { operations, content, contentType, title, prompt, currentCaption } = req.body;

      // Validate operations array
      if (!operations || !Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({
          message: 'Operations array is required',
          validOperations: VALID_METADATA_OPERATIONS,
        });
      }

      // Validate each operation
      const invalidOps = operations.filter((op: string) => !VALID_METADATA_OPERATIONS.includes(op as MetadataOperation));
      if (invalidOps.length > 0) {
        return res.status(400).json({
          message: `Invalid operations: ${invalidOps.join(', ')}`,
          validOperations: VALID_METADATA_OPERATIONS,
        });
      }

      // Validate content
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      // Validate contentType
      if (!contentType || !['article', 'post', 'newsletter'].includes(contentType)) {
        return res.status(400).json({
          message: 'Valid contentType (article, post, newsletter) is required',
        });
      }

      // Validate title is provided if seoMetadata is requested
      if (operations.includes('seoMetadata') && !title) {
        return res.status(400).json({
          message: 'Title is required when requesting seoMetadata',
        });
      }

      const result = await AIService.generateMetadataByOperations(
        operations as MetadataOperation[],
        {
          content,
          contentType: contentType as ContentType,
          title,
          prompt,
          currentCaption,
        }
      );

      res.json(result);
    } catch (error) {
      logger.error('Error generating metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ============== Agent Endpoints ==============

  static async researchQuery(req: Request, res: Response) {
    try {
      const { query, channelId, history, strategyModel, answerModel, finalAnswerModel } = req.body;
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }

      // Resolve notebook ID: channel-specific if channelId provided, otherwise catchall
      const notebookId = await resolveNotebookId(channelId);
      if (!notebookId) {
        logger.warn('No notebook found for research query - search may return no results');
      }

      // Build optional model config if any model params provided
      const modelConfig = (strategyModel || answerModel || finalAnswerModel)
        ? { strategyModel, answerModel, finalAnswerModel }
        : undefined;

      // AIService uses the workflow registry to route to the appropriate workflow
      // (webhook if configured, otherwise builtin)
      const result = await AIService.researchQuery({
        query,
        channelId,
        history,
        notebookId,
        modelConfig,
      });
      res.json(result);
    } catch (error) {
      logger.error('Error in research query:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async researchQueryStream(req: Request, res: Response) {
    try {
      const { query, channelId, history, verbose, searchWeb, strategyModel, answerModel, finalAnswerModel } = req.body;
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }

      // Resolve notebook ID: channel-specific if channelId provided, otherwise catchall
      const notebookId = await resolveNotebookId(channelId);
      if (!notebookId) {
        logger.warn('No notebook found for research query - search may return no results');
      }

      // Build optional model config if any model params provided
      const modelConfig = (strategyModel || answerModel || finalAnswerModel)
        ? { strategyModel, answerModel, finalAnswerModel }
        : undefined;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // AIService uses the workflow registry to route to the appropriate workflow
      // (webhook if configured, otherwise builtin)
      for await (const chunk of AIService.researchQueryStream({
        query,
        channelId,
        history,
        notebookId,
        verbose: verbose === true,
        searchWeb: searchWeb === true,
        modelConfig,
      })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    } catch (error) {
      logger.error('Error in research query stream:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
        res.end();
      }
    }
  }

  static async executeAgentTask(req: Request, res: Response) {
    try {
      const { type, params } = req.body;
      if (!type) {
        return res.status(400).json({ message: 'Task type is required' });
      }
      const validTypes = ['create_article_draft', 'create_post_draft', 'create_media_draft'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: `Invalid task type. Valid types: ${validTypes.join(', ')}`,
        });
      }
      const result = await AIService.executeTask({ type, params: params || {} });
      res.json(result);
    } catch (error) {
      logger.error('Error executing agent task:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ============== Open Notebook RAG Endpoints ==============

  static async searchKnowledgeBase(req: Request, res: Response) {
    try {
      const { query, type, limit, minimum_score } = req.body;
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      const result = await OpenNotebookService.search({
        query,
        type: type || 'vector',
        limit: limit || 10,
        minimum_score: minimum_score || 0.2,
      });
      res.json(result);
    } catch (error) {
      logger.error('Error searching knowledge base:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async askKnowledgeBase(req: Request, res: Response) {
    try {
      const { question, strategy_model, answer_model, final_answer_model } = req.body;
      if (!question) {
        return res.status(400).json({ message: 'Question is required' });
      }
      const result = await OpenNotebookService.ask({
        question,
        strategy_model,
        answer_model,
        final_answer_model,
      });
      res.json(result);
    } catch (error) {
      logger.error('Error asking knowledge base:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ============== Health Check ==============

  static async healthCheck(req: Request, res: Response) {
    try {
      const [openNotebookHealthy, geminiHealthy] = await Promise.all([
        OpenNotebookService.healthCheck().catch(() => false),
        AIService.healthCheck().catch(() => false),
      ]);

      res.json({
        status: 'ok',
        services: {
          gemini: geminiHealthy,
          open_notebook: openNotebookHealthy,
        },
      });
    } catch (error) {
      logger.error('Error in health check:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
