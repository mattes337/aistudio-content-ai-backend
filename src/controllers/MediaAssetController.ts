import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreateMediaAssetRequest, UpdateMediaAssetRequest, MediaAssetQueryOptions, MediaType, FileStatus } from '../models/MediaAsset';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';
import { createThumbnail, getThumbnailUrl, deleteThumbnail } from '../utils/thumbnail';
import path from 'path';
import fs from 'fs';

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
      // Check if this is a base64 upload request (has image_url instead of file_path)
      if (req.body.image_url && !req.body.file_path) {
        return MediaAssetController.uploadBase64MediaAsset(req, res);
      }

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

  static async uploadBase64MediaAsset(req: Request, res: Response) {
    try {
      const { image_url, title, type, data, article_id, newsletter_id } = req.body;

      if (!image_url) {
        return res.status(400).json({ message: 'image_url is required' });
      }

      // Validate media type - use generic_image if invalid or not provided
      const validTypes = ['instagram_post', 'article_feature', 'article_inline', 'icon', 'generic_image'];
      const mediaType = validTypes.includes(type) ? type : 'generic_image';

      // Extract base64 data from data URL or use raw base64
      let base64Data: string;
      let mimeType = 'image/png';

      if (image_url.startsWith('data:')) {
        const matches = image_url.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ message: 'Invalid base64 data URL format' });
        }
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        base64Data = image_url;
      }

      // Determine file extension from mime type
      const extMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'image/webp': '.webp',
      };
      const ext = extMap[mimeType] || '.png';

      // Generate unique filename
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6);
      const filename = `generated-${timestamp}-${random}${ext}`;

      // Save to uploads directory
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Create thumbnail
      const thumbnailFilename = await createThumbnail(filename);

      // Create media asset record
      const assetData: CreateMediaAssetRequest = {
        title: title || 'Generated Image',
        type: mediaType,
        file_path: filename,
        data: {
          ...data,
          mimeType,
          size: buffer.length,
          thumbnailPath: thumbnailFilename,
          generatedAt: new Date().toISOString(),
        },
      };

      const asset = await DatabaseService.createMediaAsset(assetData);

      // If article_id or newsletter_id provided, update the feature_image_id
      if (article_id) {
        await DatabaseService.updateArticle({ id: article_id, feature_image_id: asset.id });
        logger.info(`[MediaAsset] Linked image ${asset.id} to article ${article_id}`);
      }
      if (newsletter_id) {
        await DatabaseService.updateNewsletter({ id: newsletter_id, feature_image_id: asset.id });
        logger.info(`[MediaAsset] Linked image ${asset.id} to newsletter ${newsletter_id}`);
      }

      const assetWithUrl = {
        ...asset,
        url: getFileUrl(asset.file_path),
        thumbnail_url: getThumbnailUrl(asset.file_path),
      };

      logger.info(`[MediaAsset] Saved generated image: ${filename} (${buffer.length} bytes)`);
      res.status(201).json(assetWithUrl);
    } catch (error) {
      logger.error('Error uploading base64 media asset:', error);
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

      // Soft delete in database (sets file_status='deleted')
      // The row is kept so the processor can sync the deletion to WordPress
      const deletedAsset = await DatabaseService.deleteMediaAsset(assetId);

      if (!deletedAsset) {
        return res.status(404).json({ message: 'Media asset not found' });
      }

      // Delete the actual files from disk
      const uploadsDir = path.join(__dirname, '../../uploads');
      const filePath = path.join(uploadsDir, deletedAsset.file_path);

      try {
        // Delete main file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted media file: ${deletedAsset.file_path}`);
        }

        // Delete thumbnail if it exists
        deleteThumbnail(deletedAsset.file_path);
      } catch (fileError) {
        // Log but don't fail - the soft delete already succeeded
        logger.warn('Failed to delete media file from disk:', fileError);
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting media asset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
