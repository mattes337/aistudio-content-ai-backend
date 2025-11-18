export interface Article {
  id: string;
  title: string;
  content: string;
  title_image_url?: string;
  title_image_alt?: string;
  inline_images?: InlineImage[];
  status: ArticleStatus;
  publish_date?: Date;
  author?: string;
  excerpt?: string;
  categories?: string[];
  tags?: string[];
  seo?: SEO;
  channel_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface InlineImage {
  id: string;
  url: string;
  alt: string;
}

export interface SEO {
  title: string;
  description: string;
  keywords: string;
  slug: string;
}

export type ArticleStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'archived';

export interface CreateArticleRequest {
  title: string;
  content: string;
  title_image_url?: string;
  title_image_alt?: string;
  inline_images?: InlineImage[];
  status: ArticleStatus;
  publish_date?: Date;
  author?: string;
  excerpt?: string;
  categories?: string[];
  tags?: string[];
  seo?: SEO;
  channel_id: string;
}

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {
  id: string;
}
