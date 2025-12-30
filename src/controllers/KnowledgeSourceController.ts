import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import {
  CreateKnowledgeSourceRequest,
  UpdateKnowledgeSourceRequest,
  FolderTreeNode,
  KnowledgeSourceQueryOptions,
  KnowledgeSourceType,
  ProcessingStatus
} from '../models/KnowledgeSource';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';

export class KnowledgeSourceController {
  static async getKnowledgeSources(req: Request, res: Response) {
    try {
      const options: KnowledgeSourceQueryOptions = {
        folder_path: req.query.folder_path as string | undefined,
        search: req.query.search as string | undefined,
        type: req.query.type as KnowledgeSourceType | undefined,
        status: req.query.status as ProcessingStatus | undefined,
        sort_by: req.query.sort_by as 'name' | 'created_at' | 'updated_at' | 'type' | undefined,
        sort_order: req.query.sort_order as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const result = await DatabaseService.getKnowledgeSources(options);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching knowledge sources:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getFolderTree(req: Request, res: Response) {
    try {
      const folders = await DatabaseService.getKnowledgeSourceFolders();
      const tree = KnowledgeSourceController.buildFolderTree(folders);
      res.json(tree);
    } catch (error) {
      logger.error('Error fetching folder tree:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  private static buildFolderTree(
    folders: { folder_path: string | null; item_count: number }[]
  ): FolderTreeNode[] {
    const rootItems = folders.find(f => f.folder_path === null);
    const tree: FolderTreeNode[] = [];

    // Add root node for uncategorized items if any exist
    if (rootItems && rootItems.item_count > 0) {
      tree.push({
        name: '(Uncategorized)',
        path: '',
        children: [],
        item_count: rootItems.item_count
      });
    }

    // Build tree from folder paths
    const pathMap = new Map<string, FolderTreeNode>();

    // First pass: create all folder nodes
    for (const folder of folders) {
      if (folder.folder_path === null) continue;

      const parts = folder.folder_path.split('/');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const prevPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!pathMap.has(currentPath)) {
          const node: FolderTreeNode = {
            name: part,
            path: currentPath,
            children: [],
            item_count: 0
          };
          pathMap.set(currentPath, node);

          // Link to parent or root
          if (prevPath) {
            const parent = pathMap.get(prevPath);
            if (parent) {
              parent.children.push(node);
            }
          } else {
            tree.push(node);
          }
        }
      }

      // Set item count for the actual folder
      const node = pathMap.get(folder.folder_path);
      if (node) {
        node.item_count = folder.item_count;
      }
    }

    // Sort children alphabetically at each level
    const sortTree = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => {
        // Keep (Uncategorized) first
        if (a.name === '(Uncategorized)') return -1;
        if (b.name === '(Uncategorized)') return 1;
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortTree(node.children);
        }
      }
    };

    sortTree(tree);
    return tree;
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
