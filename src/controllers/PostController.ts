import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CreatePostRequest, UpdatePostRequest } from '../models/Post';
import logger from '../utils/logger';

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
      
      res.json(post);
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
}
