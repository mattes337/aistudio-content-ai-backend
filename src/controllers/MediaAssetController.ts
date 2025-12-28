import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreateMediaAssetRequest, UpdateMediaAssetRequest } from '../models/MediaAsset';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';

export class MediaAssetController {
  static async getMediaAssets(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const assets = await DatabaseService.getMediaAssets(type as string);

      // Add URL to each asset
      const assetsWithUrl = assets.map(asset => ({
        ...asset,
        url: getFileUrl(asset.file_path)
      }));

      res.json(assetsWithUrl);
    } catch (error) {
      logger.error('Error fetching media assets:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getMediaAssetById(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      if (!assetId) return res.status(400).json({ message: 'ID is required' });
      const asset = await DatabaseService.getMediaAssetById(assetId);

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

  static async uploadMediaAsset(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { title, type } = req.body;
      if (!title || !type) {
        return res.status(400).json({ message: 'Title and type are required' });
      }

      const assetData: CreateMediaAssetRequest = {
        title,
        type,
        file_path: req.file.filename,
        data: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        }
      };

      const asset = await DatabaseService.createMediaAsset(assetData);
      const assetWithUrl = {
        ...asset,
        url: getFileUrl(asset.file_path)
      };

      res.status(201).json(assetWithUrl);
    } catch (error) {
      logger.error('Error uploading media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateMediaAsset(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      if (!assetId) return res.status(400).json({ message: 'ID is required' });
      const assetData: UpdateMediaAssetRequest = { id: assetId, ...req.body };
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
      const { assetId } = req.params;
      if (!assetId) return res.status(400).json({ message: 'ID is required' });
      const success = await DatabaseService.deleteMediaAsset(assetId);

      if (!success) {
        return res.status(404).json({ message: 'Media asset not found' });
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
