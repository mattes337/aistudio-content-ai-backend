import { Request, Response } from 'express';
import { AIService } from '../services/AIService';
import logger from '../utils/logger';

export class AIController {
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

      // First, get embedding for the query
      const embedding = await AIService.getEmbedding(query);
      
      // Then search for similar content
      const results = await AIService.searchSimilarContent(embedding, limit || 10, threshold || 0.7);
      res.json(results);
    } catch (error) {
      logger.error('Error searching knowledge:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
