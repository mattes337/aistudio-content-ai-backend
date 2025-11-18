import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateNewsletterRequest, UpdateNewsletterRequest } from '../models/Newsletter';
import logger from '../utils/logger';

export class NewsletterController {
  static async getNewsletters(req: Request, res: Response) {
    try {
      const newsletters = await DatabaseService.getNewsletters();
      res.json(newsletters);
    } catch (error) {
      logger.error('Error fetching newsletters:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getNewsletterById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const newsletter = await DatabaseService.getNewsletterById(id);
      
      if (!newsletter) {
        return res.status(404).json({ message: 'Newsletter not found' });
      }
      
      res.json(newsletter);
    } catch (error) {
      logger.error('Error fetching newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createNewsletter(req: Request, res: Response) {
    try {
      const newsletterData: CreateNewsletterRequest = req.body;
      const newsletter = await DatabaseService.createNewsletter(newsletterData);
      res.status(201).json(newsletter);
    } catch (error) {
      logger.error('Error creating newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateNewsletter(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const newsletterData: UpdateNewsletterRequest = { id, ...req.body };
      const newsletter = await DatabaseService.updateNewsletter(newsletterData);
      
      if (!newsletter) {
        return res.status(404).json({ message: 'Newsletter not found' });
      }
      
      res.json(newsletter);
    } catch (error) {
      logger.error('Error updating newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteNewsletter(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await DatabaseService.deleteNewsletter(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Newsletter not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting newsletter:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
