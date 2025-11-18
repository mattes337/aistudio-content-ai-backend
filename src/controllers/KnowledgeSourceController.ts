import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreateKnowledgeSourceRequest, UpdateKnowledgeSourceRequest } from '../models/KnowledgeSource';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';

export class KnowledgeSourceController {
  static async getKnowledgeSources(req: Request, res: Response) {
    try {
      const sources = await DatabaseService.getKnowledgeSources();
      res.json(sources);
    } catch (error) {
      logger.error('Error fetching knowledge sources:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getKnowledgeSourceById(req: Request, res: Response) {
    try {
      const { sourceId } = req.params;
      const source = await DatabaseService.getKnowledgeSourceById(sourceId);
      
      if (!source) {
        return res.status(404).json({ message: 'Knowledge source not found' });
      }

      const chunks = await DatabaseService.getKnowledgeChunks(sourceId);
      
      res.json({
        ...source,
        chunks
      });
    } catch (error) {
      logger.error('Error fetching knowledge source:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createKnowledgeSource(req: Request, res: Response) {
    try {
      const sourceData: CreateKnowledgeSourceRequest = req.body;
      const source = await DatabaseService.createKnowledgeSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      logger.error('Error creating knowledge source:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateKnowledgeSource(req: Request, res: Response) {
    try {
      const { sourceId } = req.params;
      const sourceData: UpdateKnowledgeSourceRequest = { id: sourceId, ...req.body };
      const source = await DatabaseService.updateKnowledgeSource(sourceData);
      
      if (!source) {
        return res.status(404).json({ message: 'Knowledge source not found' });
      }
      
      res.json(source);
    } catch (error) {
      logger.error('Error updating knowledge source:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteKnowledgeSource(req: Request, res: Response) {
    try {
      const { sourceId } = req.params;
      const deleted = await DatabaseService.deleteKnowledgeSource(sourceId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Knowledge source not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting knowledge source:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async reingestKnowledgeSource(req: Request, res: Response) {
    try {
      const { sourceId } = req.params;
      const source = await DatabaseService.getKnowledgeSourceById(sourceId);
      
      if (!source) {
        return res.status(404).json({ message: 'Knowledge source not found' });
      }

      // TODO: Implement reingestion logic
      // This would trigger the ingestion pipeline again
      res.json({ message: 'Reingestion started', source });
    } catch (error) {
      logger.error('Error reingesting knowledge source:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async uploadKnowledgeSourceFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { sourceId } = req.params;
      const source = await DatabaseService.getKnowledgeSourceById(sourceId);
      
      if (!source) {
        return res.status(404).json({ message: 'Knowledge source not found' });
      }

      const updateData: UpdateKnowledgeSourceRequest = {
        id: sourceId,
        file_path: req.file.filename,
        data: {
          ...source.data,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        }
      };

      const updatedSource = await DatabaseService.updateKnowledgeSource(updateData);
      
      if (!updatedSource) {
        return res.status(500).json({ message: 'Failed to update knowledge source' });
      }

      res.json(updatedSource);
    } catch (error) {
      logger.error('Error uploading knowledge source file:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
