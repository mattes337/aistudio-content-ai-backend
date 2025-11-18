export interface Article {
  id: string;
  title: string;
  status: ArticleStatus;
  publish_date?: Date;
  channel_id: string;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type ArticleStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'archived';

export interface CreateArticleRequest {
  title: string;
  status?: ArticleStatus;
  publish_date?: Date;
  channel_id: string;
  data?: Record<string, any>;
}

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {
  id: string;
}
