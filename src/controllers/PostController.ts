import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreatePostRequest, UpdatePostRequest } from '../models/Post';
import logger from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';

export class PostController {
  static async getPosts(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const posts = await DatabaseService.getPosts(status as string);
      res.json(posts);
    } catch (error) {
      logger.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getPostById(req: Request, res: Response) {
    try {
      const { postId } = req.params;
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
      const post = await DatabaseService.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const updateData: UpdatePostRequest = {
        id: postId,
        preview_file_path: req.file.filename,
        data: {
          ...post.data,
          previewImage: {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
          }
        }
      };

      const updatedPost = await DatabaseService.updatePost(updateData);
      
      if (!updatedPost) {
        return res.status(500).json({ message: 'Failed to update post' });
      }

      const postWithPreview = {
        ...updatedPost,
        previewImageUrl: getFileUrl(updatedPost.preview_file_path)
      };

      res.json(postWithPreview);
    } catch (error) {
      logger.error('Error uploading preview image:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
