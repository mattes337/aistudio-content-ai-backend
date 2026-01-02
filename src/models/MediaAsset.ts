import type { PaginatedResponse } from '../utils/pagination';

export interface MediaAsset {
  id: string;
  title: string;
  type: MediaType;
  file_path: string;
  file_status: FileStatus;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type MediaType = 'instagram_post' | 'article_feature' | 'article_inline' | 'icon' | 'generic_image';
export type FileStatus = 'active' | 'uploading' | 'missing' | 'deleted';

/**
 * Media asset list item - partial data returned in list endpoints.
 * Excludes the full `data` field to keep response sizes small.
 */
export interface MediaAssetListItem {
  id: string;
  title: string;
  type: MediaType;
  file_path: string;
  file_status: FileStatus;
  created_at: Date;
  updated_at: Date;
  url?: string; // Generated URL for the file
}

/**
 * Query options for filtering, sorting, and paginating media assets.
 */
export interface MediaAssetQueryOptions {
  search?: string;           // Search in title
  type?: MediaType;          // Filter by type
  file_status?: FileStatus;  // Filter by file status
  sort_by?: 'title' | 'type' | 'file_status' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedMediaAssets = PaginatedResponse<MediaAssetListItem>;

export interface CreateMediaAssetRequest {
  title: string;
  type: MediaType;
  file_path: string;
  data?: Record<string, any>;
}

export interface UpdateMediaAssetRequest extends Partial<CreateMediaAssetRequest> {
  id: string;
}
