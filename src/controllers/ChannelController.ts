import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreateChannelRequest, UpdateChannelRequest, ChannelQueryOptions, ChannelType, PlatformApi } from '../models/Channel';
import logger from '../utils/logger';

export class ChannelController {
  static async getChannels(req: Request, res: Response) {
    try {
      const options: ChannelQueryOptions = {
        search: req.query.search as string | undefined,
        type: req.query.type as ChannelType | undefined,
        platform_api: req.query.platform_api as PlatformApi | undefined,
        sort_by: req.query.sort_by as ChannelQueryOptions['sort_by'] | undefined,
        sort_order: req.query.sort_order as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const result = await DatabaseService.getChannels(options);
      res.json(result);
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
      const channelData: CreateChannelRequest = req.body;
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
      const channelData: UpdateChannelRequest = { id: channelId, ...req.body };
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
