import type { PaginatedResponse } from '../utils/pagination';

/**
 * Supported post types - extensible for future types
 */
export type PostType = 'image' | 'carousel';

/**
 * Text overlay on a slide
 */
export interface PostOverlay {
  id: string;
  text: string;
  position?: {
    x: number;
    y: number;
  };
  style?: Record<string, any>;
}

/**
 * Individual slide in a carousel post
 */
export interface PostSlide {
  id: string;
  imageUrl: string;
  description?: string;
  overlays?: PostOverlay[];
}

/**
 * Post data structure stored in the JSONB column
 */
export interface PostData {
  content?: string;
  type?: PostType;
  slides?: PostSlide[];
  // Legacy/additional fields
  caption?: string;
  overlays?: PostOverlay[];
  tags?: string[];
  location?: string;
  tagged_users?: string[];
  alt_text?: string;
  settings?: Record<string, any>;
  previewImage?: {
    originalName: string;
    mimeType: string;
    size: number;
    thumbnailPath?: string;
  };
  [key: string]: any;
}

export interface Post {
  id: string;
  status: PostStatus;
  publish_date?: Date;
  platform: string;
  linked_article_id?: string;
  data: PostData;
  preview_file_path?: string;
  file_status: FileStatus;
  created_at: Date;
  updated_at: Date;
}

export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'deleted';
export type FileStatus = 'active' | 'uploading' | 'missing' | 'deleted';

/**
 * Post list item - partial data returned in list endpoints.
 * Excludes the full `data` field to keep response sizes small.
 */
export interface PostListItem {
  id: string;
  status: PostStatus;
  publish_date?: Date;
  platform: string;
  post_type?: PostType;
  caption?: string;
  linked_article_id?: string;
  linked_article_title?: string;
  preview_file_path?: string;
  file_status: FileStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Query options for filtering, sorting, and paginating posts.
 */
export interface PostQueryOptions {
  search?: string;           // Search in platform or linked article title
  status?: PostStatus;       // Filter by status
  platform?: string;         // Filter by platform
  linked_article_id?: string; // Filter by linked article
  sort_by?: 'status' | 'platform' | 'publish_date' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedPosts = PaginatedResponse<PostListItem>;

export interface CreatePostRequest {
  status?: PostStatus;
  publish_date?: Date;
  platform: string;
  linked_article_id?: string;
  data?: PostData;
  preview_file_path?: string;
  file_status?: FileStatus;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}
