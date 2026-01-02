import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreateRecipientRequest, UpdateRecipientRequest, RecipientQueryOptions, RecipientStatus } from '../models/Recipient';
import logger from '../utils/logger';

export class RecipientController {
  static async getRecipients(req: Request, res: Response) {
    try {
      const options: RecipientQueryOptions = {
        search: req.query.search as string | undefined,
        status: req.query.status as RecipientStatus | undefined,
        channel_id: req.query.channel_id as string | undefined,
        sort_by: req.query.sort_by as RecipientQueryOptions['sort_by'] | undefined,
        sort_order: req.query.sort_order as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const result = await DatabaseService.getRecipients(options);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching recipients:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getRecipientById(req: Request, res: Response) {
    try {
      const { recipientId } = req.params;
      const recipient = await DatabaseService.getRecipientById(recipientId);
      
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      res.json(recipient);
    } catch (error) {
      logger.error('Error fetching recipient:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createRecipient(req: Request, res: Response) {
    try {
      const recipientData: CreateRecipientRequest = req.body;
      const recipient = await DatabaseService.createRecipient(recipientData);
      res.status(201).json(recipient);
    } catch (error) {
      logger.error('Error creating recipient:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateRecipient(req: Request, res: Response) {
    try {
      const { recipientId } = req.params;
      const recipientData: UpdateRecipientRequest = { id: recipientId, ...req.body };
      const recipient = await DatabaseService.updateRecipient(recipientData);
      
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      res.json(recipient);
    } catch (error) {
      logger.error('Error updating recipient:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteRecipient(req: Request, res: Response) {
    try {
      const { recipientId } = req.params;
      const deleted = await DatabaseService.deleteRecipient(recipientId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting recipient:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
