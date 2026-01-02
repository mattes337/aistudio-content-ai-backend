import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreateMediaAssetRequest, UpdateMediaAssetRequest, MediaAssetQueryOptions, MediaType, FileStatus } from '../models/MediaAsset';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';
import { createThumbnail, getThumbnailUrl } from '../utils/thumbnail';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MediaAssetController {
  static async getMediaAssets(req: Request, res: Response) {
    try {
      const options: MediaAssetQueryOptions = {
        search: req.query.search as string | undefined,
        type: req.query.type as MediaType | undefined,
        file_status: req.query.file_status as FileStatus | undefined,
        sort_by: req.query.sort_by as MediaAssetQueryOptions['sort_by'] | undefined,
        sort_order: req.query.sort_order as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const result = await DatabaseService.getMediaAssets(options);

      // Add URL and thumbnail URL to each asset
      const dataWithUrl = result.data.map(asset => ({
        ...asset,
        url: getFileUrl(asset.file_path),
        thumbnail_url: getThumbnailUrl(asset.file_path)
      }));

      res.json({
        ...result,
        data: dataWithUrl
      });
    } catch (error) {
      logger.error('Error fetching media assets:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getMediaAssetById(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      if (!assetId) return res.status(400).json({ message: 'ID is required' });

      // Validate UUID format
      if (!UUID_REGEX.test(assetId)) {
        return res.status(400).json({ message: 'Invalid asset ID format. Expected UUID.' });
      }

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

      // Create thumbnail for images
      const thumbnailFilename = await createThumbnail(req.file.filename);

      const assetData: CreateMediaAssetRequest = {
        title,
        type,
        file_path: req.file.filename,
        data: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          thumbnailPath: thumbnailFilename
        }
      };

      const asset = await DatabaseService.createMediaAsset(assetData);
      const assetWithUrl = {
        ...asset,
        url: getFileUrl(asset.file_path),
        thumbnail_url: getThumbnailUrl(asset.file_path)
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

      // Validate UUID format
      if (!UUID_REGEX.test(assetId)) {
        return res.status(400).json({ message: 'Invalid asset ID format. Expected UUID.' });
      }

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

      // Validate UUID format to prevent database errors with local/temporary IDs
      if (!UUID_REGEX.test(assetId)) {
        return res.status(400).json({ message: 'Invalid asset ID format. Expected UUID.' });
      }

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
