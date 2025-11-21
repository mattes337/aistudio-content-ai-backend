import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateChannelRequest, UpdateChannelRequest } from '../models/Channel';
import logger from '../utils/logger';

export class ChannelController {
  static async getChannels(req: Request, res: Response) {
    try {
      const channels = await DatabaseService.getChannels();
      res.json(channels);
    } catch (error) {
      logger.error('Error fetching channels:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getChannelById(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const channel = await DatabaseService.getChannelById(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      res.json(channel);
    } catch (error) {
      logger.error('Error fetching channel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createChannel(req: Request, res: Response) {
    try {
      // Handle metadata to data mapping for compatibility
      const requestBody = { ...req.body };
      if (requestBody.metadata && !requestBody.data) {
        requestBody.data = requestBody.metadata;
        delete requestBody.metadata;
      }

      const channelData: CreateChannelRequest = requestBody;
      const channel = await DatabaseService.createChannel(channelData);
      res.status(201).json(channel);
    } catch (error) {
      logger.error('Error creating channel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateChannel(req: Request, res: Response) {
    try {
      const { channelId } = req.params;

      // Handle metadata to data mapping for compatibility
      const requestBody = { ...req.body };
      if (requestBody.metadata && !requestBody.data) {
        requestBody.data = requestBody.metadata;
        delete requestBody.metadata;
      }

      const channelData: UpdateChannelRequest = { id: channelId, ...requestBody };
      const channel = await DatabaseService.updateChannel(channelData);

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      res.json(channel);
    } catch (error) {
      logger.error('Error updating channel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteChannel(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const deleted = await DatabaseService.deleteChannel(channelId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting channel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
