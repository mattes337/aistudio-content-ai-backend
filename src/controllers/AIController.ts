import { Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { GeminiService } from '../services/GeminiService';
import { ClaudeAgentService } from '../services/ClaudeAgentService';
import { OpenNotebookService } from '../services/OpenNotebookService';
import logger from '../utils/logger';

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

  static async generateArticleTitle(req: Request, res: Response) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      const title = await AIService.generateArticleTitle(content);
      res.json({ title });
    } catch (error) {
      logger.error('Error generating article title:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateArticleMetadata(req: Request, res: Response) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      const metadata = await AIService.generateArticleMetadata(content);
      res.json(metadata);
    } catch (error) {
      logger.error('Error generating article metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generatePostDetails(req: Request, res: Response) {
    try {
      const { prompt, currentCaption } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      const details = await AIService.generatePostDetails(prompt, currentCaption);
      res.json(details);
    } catch (error) {
      logger.error('Error generating post details:', error);
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
      const imageData = await AIService.editImage(prompt, base64ImageData, mimeType);
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

  static async searchKnowledge(req: Request, res: Response) {
    try {
      const { query, limit, threshold } = req.body;
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      const embedding = await AIService.getEmbedding(query);
      const results = await AIService.searchSimilarContent(embedding, limit || 10, threshold || 0.7);
      res.json(results);
    } catch (error) {
      logger.error('Error searching knowledge:', error);
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

      const result = await GeminiService.refineContent(
        currentContent || '',
        instruction,
        type,
        history || []
      );
      res.json(result);
    } catch (error) {
      logger.error('Error refining content:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateTitle(req: Request, res: Response) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      const result = await GeminiService.generateTitle(content);
      res.json(result);
    } catch (error) {
      logger.error('Error generating title:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateSubject(req: Request, res: Response) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      const result = await GeminiService.generateSubject(content);
      res.json(result);
    } catch (error) {
      logger.error('Error generating subject:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateMetadata(req: Request, res: Response) {
    try {
      const { content, title } = req.body;
      if (!content || !title) {
        return res.status(400).json({ message: 'Content and title are required' });
      }
      const result = await GeminiService.generateMetadata(content, title);
      res.json(result);
    } catch (error) {
      logger.error('Error generating metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateExcerpt(req: Request, res: Response) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      const result = await GeminiService.generateExcerpt(content);
      res.json(result);
    } catch (error) {
      logger.error('Error generating excerpt:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generatePreviewText(req: Request, res: Response) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      const result = await GeminiService.generatePreviewText(content);
      res.json(result);
    } catch (error) {
      logger.error('Error generating preview text:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generatePostDetailsNew(req: Request, res: Response) {
    try {
      const { prompt, currentCaption } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      const result = await GeminiService.generatePostDetails(prompt, currentCaption || '');
      res.json(result);
    } catch (error) {
      logger.error('Error generating post details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async generateImageNew(req: Request, res: Response) {
    try {
      const { prompt, aspectRatio } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      const result = await GeminiService.generateImage(prompt, aspectRatio || '1:1');
      res.json(result);
    } catch (error) {
      logger.error('Error generating image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async editImageNew(req: Request, res: Response) {
    try {
      const { base64ImageData, mimeType, prompt } = req.body;
      if (!base64ImageData || !mimeType || !prompt) {
        return res.status(400).json({ message: 'Base64 image data, mime type, and prompt are required' });
      }
      const result = await GeminiService.editImage(base64ImageData, mimeType, prompt);
      res.json(result);
    } catch (error) {
      logger.error('Error editing image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async inferMetadata(req: Request, res: Response) {
    try {
      const { content, type } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }
      if (!type || !['article', 'post', 'newsletter'].includes(type)) {
        return res.status(400).json({ message: 'Valid type (article, post, newsletter) is required' });
      }
      const result = await GeminiService.inferMetadata(content, type);
      res.json(result);
    } catch (error) {
      logger.error('Error inferring metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ============== Claude Agent Endpoints ==============

  static async researchQuery(req: Request, res: Response) {
    try {
      const { query, channelId, history, notebookId } = req.body;
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      const result = await ClaudeAgentService.researchQuery({
        query,
        channelId,
        history,
        notebookId,
      });
      res.json(result);
    } catch (error) {
      logger.error('Error in research query:', error);
      res.status(500).json({ message: 'Internal server error' });
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
          message: `Invalid task type. Valid types: ${validTypes.join(', ')}`
        });
      }
      const result = await ClaudeAgentService.executeTask({ type, params: params || {} });
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
      const [openNotebookHealthy, claudeAgentHealthy] = await Promise.all([
        OpenNotebookService.healthCheck().catch(() => false),
        ClaudeAgentService.healthCheck().catch(() => false),
      ]);

      res.json({
        status: 'ok',
        services: {
          gemini: !!process.env.GEMINI_API_KEY,
          claude_agent: claudeAgentHealthy,
          open_notebook: openNotebookHealthy,
        },
      });
    } catch (error) {
      logger.error('Error in health check:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
