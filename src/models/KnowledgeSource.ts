export type KnowledgeSourceType = 'text' | 'website' | 'pdf' | 'instagram' | 'youtube' | 'video_file' | 'audio_file';
export type ProcessingStatus = 'pending' | 'processed' | 'error' | 'deleted';
export type EmbeddingStatus = 'pending' | 'complete' | 'failed';
export type FileStatus = 'active' | 'uploading' | 'missing' | 'deleted';

/**
 * Data fields that can be stored with a knowledge source.
 * All fields are optional for backwards compatibility.
 */
export interface KnowledgeSourceData {
  /** Selected transformations to apply via Open Notebook (e.g., ["dense-summary", "key-insights"]) */
  transformations?: string[];
  /** Insight IDs created by Open Notebook for each transformation: { transformation_name: insight_id } */
  open_notebook_insight_ids?: Record<string, string>;
  /** Any additional custom data fields */
  [key: string]: any;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  status: ProcessingStatus;
  source_origin: string;
  file_path?: string;
  file_status: FileStatus;
  folder_path?: string; // Virtual folder path for organization (e.g., "my-files/subA/texts")
  data: KnowledgeSourceData;
  // Open Notebook sync tracking
  open_notebook_synced_at?: Date;
  open_notebook_source_ids?: Record<string, string>; // { channel_id: notebook_source_id }
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

export interface CreateKnowledgeSourceRequest {
  name: string;
  type: KnowledgeSourceType;
  source_origin: string;
  folder_path?: string; // Virtual folder path for organization
  data?: KnowledgeSourceData;
}

export interface UpdateKnowledgeSourceRequest extends Partial<CreateKnowledgeSourceRequest> {
  id: string;
  file_path?: string;
}

export interface FolderTreeNode {
  name: string;           // Folder name (last segment of path)
  path: string;           // Full folder path
  children: FolderTreeNode[];
  item_count: number;     // Number of items directly in this folder
}

// Pagination, sorting, and filtering options for knowledge sources
export interface KnowledgeSourceQueryOptions {
  folder_path?: string;   // Filter by exact folder path (exclusive - only items directly in folder)
  search?: string;        // Search by name (and optionally content)
  search_content?: boolean; // If true, also search in chunk content
  type?: KnowledgeSourceType;  // Filter by type
  status?: ProcessingStatus;   // Filter by status
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'type';
  sort_order?: 'asc' | 'desc';
  limit?: number;         // Max 100, default 100
  offset?: number;        // Default 0
}

export interface PaginatedKnowledgeSources {
  data: KnowledgeSource[];
  total: number;
  limit: number;
  offset: number;
}

// Processing log types
export type LogStatus = 'info' | 'warning' | 'error' | 'success';

export interface KnowledgeSourceLog {
  id: string;
  knowledge_source_id: string;
  event_type: string;
  status: LogStatus;
  message: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface PaginatedKnowledgeSourceLogs {
  data: KnowledgeSourceLog[];
  total: number;
  limit: number;
  offset: number;
}
