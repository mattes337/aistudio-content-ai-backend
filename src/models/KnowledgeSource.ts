export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  status: ProcessingStatus;
  source_origin: string;
  file_path?: string;
  file_status: FileStatus;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeChunk {
  id: string;
  knowledge_source_id: string;
  content: string;
  embedding_status: EmbeddingStatus;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeSourceChannel {
  knowledge_source_id: string;
  channel_id: string;
}

export type KnowledgeSourceType = 'text' | 'website' | 'pdf' | 'instagram' | 'youtube' | 'video_file' | 'audio_file';
export type ProcessingStatus = 'pending' | 'processed' | 'error';
export type EmbeddingStatus = 'pending' | 'complete' | 'failed';
export type FileStatus = 'active' | 'uploading' | 'missing' | 'deleted';

export interface CreateKnowledgeSourceRequest {
  name: string;
  type: KnowledgeSourceType;
  source_origin: string;
  data?: Record<string, any>;
}

export interface UpdateKnowledgeSourceRequest extends Partial<CreateKnowledgeSourceRequest> {
  id: string;
}
