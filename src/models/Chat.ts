import type { PaginatedResponse } from '../utils/pagination';

export interface ChatSession {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
  channels: string[];
}

/**
 * Chat session list item - partial data returned in list endpoints.
 * Includes message count for summary.
 */
export interface ChatSessionListItem {
  id: string;
  title: string;
  message_count: number;
  channel_names?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Chat message list item - partial data returned in list endpoints.
 * Excludes full content to keep response sizes small.
 */
export interface ChatMessageListItem {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content_preview: string; // First 200 characters of content
  created_at: Date;
}

/**
 * Query options for filtering, sorting, and paginating chat sessions.
 */
export interface ChatSessionQueryOptions {
  search?: string;           // Search in title
  sort_by?: 'title' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

/**
 * Query options for filtering, sorting, and paginating chat messages.
 */
export interface ChatMessageQueryOptions {
  search?: string;           // Search in content
  role?: 'user' | 'assistant'; // Filter by role
  sort_by?: 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedChatSessions = PaginatedResponse<ChatSessionListItem>;
export type PaginatedChatMessages = PaginatedResponse<ChatMessageListItem>;

export interface CreateChatSessionRequest {
  title?: string;
  channel_ids?: string[];
}

export interface UpdateChatSessionRequest {
  id: string;
  title?: string;
  channel_ids?: string[];
}

export interface CreateChatMessageRequest {
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSessionChannel {
  session_id: string;
  channel_id: string;
}
