import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreateArticleRequest, UpdateArticleRequest, ArticleQueryOptions, ArticleStatus } from '../models/Article';
import logger from '../utils/logger';

export class ArticleController {
  static async getArticles(req: Request, res: Response) {
    try {
      const options: ArticleQueryOptions = {
        search: req.query.search as string | undefined,
        status: req.query.status as ArticleStatus | undefined,
        channel_id: req.query.channel_id as string | undefined,
        sort_by: req.query.sort_by as ArticleQueryOptions['sort_by'] | undefined,
        sort_order: req.query.sort_order as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const result = await DatabaseService.getArticles(options);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching articles:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getArticleById(req: Request, res: Response) {
    try {
      const { articleId } = req.params;
      const article = await DatabaseService.getArticleById(articleId);
      
      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      logger.error('Error fetching article:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createArticle(req: Request, res: Response) {
    try {
      const articleData: CreateArticleRequest = req.body;
      const article = await DatabaseService.createArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      logger.error('Error creating article:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateArticle(req: Request, res: Response) {
    try {
      const { articleId } = req.params;
      const articleData: UpdateArticleRequest = { id: articleId, ...req.body };
      const article = await DatabaseService.updateArticle(articleData);
      
      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      logger.error('Error updating article:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteArticle(req: Request, res: Response) {
    try {
      const { articleId } = req.params;
      const deleted = await DatabaseService.deleteArticle(articleId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Article not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting article:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
