import type { PaginatedResponse } from '../utils/pagination';

export interface Article {
  id: string;
  title: string;
  status: ArticleStatus;
  publish_date?: Date;
  channel_id: string;
  feature_image_id?: string;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type ArticleStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'archived';

/**
 * Article list item - partial data returned in list endpoints.
 * Excludes the full `data` field to keep response sizes small.
 */
export interface ArticleListItem {
  id: string;
  title: string;
  status: ArticleStatus;
  publish_date?: Date;
  channel_id: string;
  channel_name?: string;
  feature_image_url?: string;
  feature_image_thumbnail_url?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Query options for filtering, sorting, and paginating articles.
 */
export interface ArticleQueryOptions {
  search?: string;           // Search in title
  status?: ArticleStatus;    // Filter by status
  channel_id?: string;       // Filter by channel
  sort_by?: 'title' | 'status' | 'publish_date' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedArticles = PaginatedResponse<ArticleListItem>;

export interface CreateArticleRequest {
  title: string;
  status?: ArticleStatus;
  publish_date?: Date;
  channel_id: string;
  feature_image_id?: string;
  data?: Record<string, any>;
}

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {
  id: string;
}
