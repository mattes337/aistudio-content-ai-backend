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
