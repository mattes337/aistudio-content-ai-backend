import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateMediaAssetRequest, UpdateMediaAssetRequest } from '../models/MediaAsset';
import logger from '../utils/logger';

export class MediaAssetController {
  static async getMediaAssets(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const assets = await DatabaseService.getMediaAssets(type as string);
      res.json(assets);
    } catch (error) {
      logger.error('Error fetching media assets:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getMediaAssetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const asset = await DatabaseService.getMediaAssetById(id);
      
      if (!asset) {
        return res.status(404).json({ message: 'Media asset not found' });
      }
      
      res.json(asset);
    } catch (error) {
      logger.error('Error fetching media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createMediaAsset(req: Request, res: Response) {
    try {
      const assetData: CreateMediaAssetRequest = req.body;
      const asset = await DatabaseService.createMediaAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      logger.error('Error creating media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateMediaAsset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const assetData: UpdateMediaAssetRequest = { id, ...req.body };
      const asset = await DatabaseService.updateMediaAsset(assetData);
      
      if (!asset) {
        return res.status(404).json({ message: 'Media asset not found' });
      }
      
      res.json(asset);
    } catch (error) {
      logger.error('Error updating media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteMediaAsset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await DatabaseService.deleteMediaAsset(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Media asset not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
