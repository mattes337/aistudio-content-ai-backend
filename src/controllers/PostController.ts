import type { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { CreatePostRequest, UpdatePostRequest, PostQueryOptions, PostStatus } from '../models/Post';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';
import { createThumbnail, getThumbnailUrl } from '../utils/thumbnail';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostController {
  static async getPosts(req: Request, res: Response) {
    try {
      const options: PostQueryOptions = {
        search: req.query.search as string | undefined,
        status: req.query.status as PostStatus | undefined,
        platform: req.query.platform as string | undefined,
        linked_article_id: req.query.linked_article_id as string | undefined,
        sort_by: req.query.sort_by as PostQueryOptions['sort_by'] | undefined,
        sort_order: req.query.sort_order as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const result = await DatabaseService.getPosts(options);

      // Add thumbnail URLs to posts with preview images
      const dataWithThumbnails = result.data.map(post => ({
        ...post,
        preview_thumbnail_url: getThumbnailUrl(post.preview_file_path)
      }));

      res.json({
        ...result,
        data: dataWithThumbnails
      });
    } catch (error) {
      logger.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getPostById(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      if (!UUID_REGEX.test(postId)) {
        return res.status(400).json({ message: 'Invalid post ID format. Expected UUID.' });
      }

      const post = await DatabaseService.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Add preview image URL if exists
      const postWithPreview = {
        ...post,
        previewImageUrl: post.preview_file_path ? getFileUrl(post.preview_file_path) : null
      };
      
      res.json(postWithPreview);
    } catch (error) {
      logger.error('Error fetching post:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createPost(req: Request, res: Response) {
    try {
      const postData: CreatePostRequest = req.body;
      const post = await DatabaseService.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      logger.error('Error creating post:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updatePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      if (!UUID_REGEX.test(postId)) {
        return res.status(400).json({ message: 'Invalid post ID format. Expected UUID.' });
      }

      const postData: UpdatePostRequest = { id: postId, ...req.body };
      const post = await DatabaseService.updatePost(postData);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      res.json(post);
    } catch (error) {
      logger.error('Error updating post:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deletePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      if (!UUID_REGEX.test(postId)) {
        return res.status(400).json({ message: 'Invalid post ID format. Expected UUID.' });
      }

      const deleted = await DatabaseService.deletePost(postId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting post:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async uploadPreviewImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { postId } = req.params;

      if (!UUID_REGEX.test(postId)) {
        return res.status(400).json({ message: 'Invalid post ID format. Expected UUID.' });
      }

      const post = await DatabaseService.getPostById(postId);

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Create thumbnail for preview image
      const thumbnailFilename = await createThumbnail(req.file.filename);

      const updateData: UpdatePostRequest = {
        id: postId,
        preview_file_path: req.file.filename,
        data: {
          ...post.data,
          previewImage: {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            thumbnailPath: thumbnailFilename
          }
        }
      };

      const updatedPost = await DatabaseService.updatePost(updateData);

      if (!updatedPost) {
        return res.status(500).json({ message: 'Failed to update post' });
      }

      const postWithPreview = {
        ...updatedPost,
        previewImageUrl: getFileUrl(updatedPost.preview_file_path),
        previewThumbnailUrl: getThumbnailUrl(updatedPost.preview_file_path)
      };

      res.json(postWithPreview);
    } catch (error) {
      logger.error('Error uploading preview image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
