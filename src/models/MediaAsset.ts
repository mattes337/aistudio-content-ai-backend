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

export type MediaType = 'instagram_post' | 'article_feature' | 'article_inline' | 'icon';
export type FileStatus = 'active' | 'uploading' | 'missing' | 'deleted';

export interface CreateMediaAssetRequest {
  title: string;
  type: MediaType;
  file_path: string;
  data?: Record<string, any>;
}

export interface UpdateMediaAssetRequest extends Partial<CreateMediaAssetRequest> {
  id: string;
}
