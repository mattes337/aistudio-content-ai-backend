export interface Post {
  id: string;
  status: PostStatus;
  publish_date?: Date;
  platform: string;
  linked_article_id?: string;
  data: Record<string, any>;
  preview_file_path?: string;
  file_status: FileStatus;
  created_at: Date;
  updated_at: Date;
}

export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'deleted';
export type FileStatus = 'active' | 'uploading' | 'missing' | 'deleted';

export interface CreatePostRequest {
  status?: PostStatus;
  publish_date?: Date;
  platform: string;
  linked_article_id?: string;
  data?: Record<string, any>;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}
