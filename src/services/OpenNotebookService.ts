import { loadEnvConfig } from '../utils/env';
import logger from '../utils/logger';
import fetch from 'node-fetch';

const config = loadEnvConfig();

export interface SearchRequest {
  query: string;
  type?: 'text' | 'vector';
  limit?: number;
  search_sources?: boolean;
  search_notes?: boolean;
  minimum_score?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  source_name?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  search_type: string;
}

export interface AskRequest {
  question: string;
  strategy_model?: string;
  answer_model?: string;
  final_answer_model?: string;
}

export interface AskResponse {
  answer: string;
  question: string;
}

export interface Notebook {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  notebook_id: string;
  title?: string;
  model_override?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExecuteChatRequest {
  session_id: string;
  message: string;
  context?: Record<string, any>;
  model_override?: string;
}

export interface ExecuteChatResponse {
  session_id: string;
  messages: ChatMessage[];
}

export class OpenNotebookService {
  private static baseUrl = config.openNotebookUrl;

  /**
   * Make a request to the Open Notebook API
   */
  private static async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.openNotebookPassword) {
        headers['Authorization'] = `Bearer ${config.openNotebookPassword}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Open Notebook API error: ${response.status} - ${errorText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      logger.error(`Open Notebook request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get all notebooks
   */
  static async getNotebooks(): Promise<Notebook[]> {
    return this.makeRequest<Notebook[]>('/api/notebooks');
  }

  /**
   * Find a notebook by name (case-insensitive)
   */
  static async findNotebookByName(name: string): Promise<Notebook | null> {
    const notebooks = await this.getNotebooks();
    return notebooks.find(n => n.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Search the knowledge base
   */
  static async search(request: SearchRequest): Promise<SearchResponse> {
    logger.info(`Searching knowledge base: "${request.query.substring(0, 50)}..."`);

    const result = await this.makeRequest<SearchResponse>('/api/search', 'POST', {
      query: request.query,
      type: request.type || 'text',
      limit: request.limit || 100,
      search_sources: request.search_sources ?? true,
      search_notes: request.search_notes ?? true,
      minimum_score: request.minimum_score ?? 0.2,
    });

    logger.info(`Search API response: total_count=${result.total_count}, results=${result.results?.length || 0}, search_type=${result.search_type}`);
    if (result.results && result.results.length > 0) {
      logger.debug(`First result preview: ${JSON.stringify(result.results[0]).substring(0, 200)}...`);
    }

    return result;
  }

  /**
   * Ask a question and get an answer (non-streaming)
   */
  static async ask(request: AskRequest): Promise<AskResponse> {
    logger.info(`Asking knowledge base: "${request.question.substring(0, 50)}..."`);

    // Open Notebook API requires model parameters
    const defaultModel = 'anthropic/claude-sonnet-4-20250514';
    return this.makeRequest<AskResponse>('/api/search/ask/simple', 'POST', {
      question: request.question,
      strategy_model: request.strategy_model || defaultModel,
      answer_model: request.answer_model || defaultModel,
      final_answer_model: request.final_answer_model || defaultModel,
    });
  }

  /**
   * Get all chat sessions for a notebook
   */
  static async getChatSessions(notebookId: string): Promise<ChatSession[]> {
    return this.makeRequest<ChatSession[]>(`/api/chat/sessions?notebook_id=${notebookId}`);
  }

  /**
   * Create a new chat session
   */
  static async createChatSession(
    notebookId: string,
    title?: string,
    modelOverride?: string
  ): Promise<ChatSession> {
    return this.makeRequest<ChatSession>('/api/chat/sessions', 'POST', {
      notebook_id: notebookId,
      title,
      model_override: modelOverride,
    });
  }

  /**
   * Execute a chat request
   */
  static async executeChat(request: ExecuteChatRequest): Promise<ExecuteChatResponse> {
    logger.info(`Executing chat in session: ${request.session_id}`);

    return this.makeRequest<ExecuteChatResponse>('/api/chat/execute', 'POST', request);
  }

  /**
   * Build context for a notebook
   */
  static async buildContext(
    notebookId: string,
    contextConfig?: Record<string, any>
  ): Promise<{ context: Record<string, any>; token_count: number; char_count: number }> {
    return this.makeRequest(`/api/notebooks/${notebookId}/context`, 'POST', contextConfig || {});
  }

  /**
   * Health check for Open Notebook service
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/api/config`);
      return true;
    } catch {
      return false;
    }
  }
}
