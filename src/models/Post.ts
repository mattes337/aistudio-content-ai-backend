export interface Post {
  id: string;
  content: string;
  background_image_url: string;
  base_background_image_url?: string;
  overlays?: Overlay[];
  status: PostStatus;
  publish_date?: Date;
  platform: string;
  tags?: string[];
  location?: string;
  tagged_users?: string[];
  alt_text?: string;
  disable_comments?: boolean;
  hide_likes?: boolean;
  linked_article_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Overlay {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: any;
}

export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'deleted';

export interface CreatePostRequest {
  content: string;
  background_image_url: string;
  base_background_image_url?: string;
  overlays?: Overlay[];
  status: PostStatus;
  publish_date?: Date;
  platform: string;
  tags?: string[];
  location?: string;
  tagged_users?: string[];
  alt_text?: string;
  disable_comments?: boolean;
  hide_likes?: boolean;
  linked_article_id?: string;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}
