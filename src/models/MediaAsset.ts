export interface MediaAsset {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  type: MediaType;
  created_at: Date;
  updated_at: Date;
}

export type MediaType = 'instagram_post' | 'article_feature' | 'article_inline' | 'icon';

export interface CreateMediaAssetRequest {
  title: string;
  description?: string;
  image_url: string;
  type: MediaType;
}

export interface UpdateMediaAssetRequest extends Partial<CreateMediaAssetRequest> {
  id: string;
}
