import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateArticleRequest, UpdateArticleRequest } from '../models/Article';
import logger from '../utils/logger';

export class ArticleController {
  static async getArticles(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const articles = await DatabaseService.getArticles(status as string);
      res.json(articles);
    } catch (error) {
      logger.error('Error fetching articles:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getArticleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const article = await DatabaseService.getArticleById(id);
      
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
      const { id } = req.params;
      const articleData: UpdateArticleRequest = { id, ...req.body };
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
      const { id } = req.params;
      const deleted = await DatabaseService.deleteArticle(id);
      
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
