import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateRecipientRequest, UpdateRecipientRequest } from '../models/Recipient';
import logger from '../utils/logger';

export class RecipientController {
  static async getRecipients(req: Request, res: Response) {
    try {
      const recipients = await DatabaseService.getRecipients();
      res.json(recipients);
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
