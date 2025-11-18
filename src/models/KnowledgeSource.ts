export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  source: string;
  status: ProcessingStatus;
  ingested_content?: string;
  ingestion_log?: IngestionLogEntry[];
  created_at: Date;
  updated_at: Date;
}

export interface IngestionLogEntry {
  timestamp: Date;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface KnowledgeChunk {
  id: string;
  knowledge_source_id: string;
  content: string;
  embedding_status: EmbeddingStatus;
  embedding?: number[];
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

export interface CreateKnowledgeSourceRequest {
  name: string;
  type: KnowledgeSourceType;
  source: string;
}

export interface UpdateKnowledgeSourceRequest extends Partial<CreateKnowledgeSourceRequest> {
  id: string;
}
