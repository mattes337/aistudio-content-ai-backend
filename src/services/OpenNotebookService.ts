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
  /** Optional notebook ID to search within a specific notebook */
  notebook_id?: string;
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

// Raw API response structure (what Open Notebook actually returns)
interface RawSearchResult {
  id: string;
  parent_id?: string;
  content?: string;
  title?: string;
  source_name?: string;
  relevance?: number;
  score?: number;
  type?: string;
  metadata?: Record<string, any>;
}

interface RawSearchResponse {
  results: RawSearchResult[];
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

  /** Cached models list */
  private static modelsCache: { id: string; name: string; provider?: string }[] | null = null;
  private static modelsCacheTime: number = 0;
  private static readonly MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    const searchBody = {
      query: request.query,
      type: request.type || 'text',
      limit: request.limit || 100,
      search_sources: request.search_sources ?? true,
      search_notes: request.search_notes ?? true,
      minimum_score: request.minimum_score ?? 0.2,
      ...(request.notebook_id && { notebook_id: request.notebook_id }),
    };

    logger.info(`Searching knowledge base: "${request.query.substring(0, 50)}..." with params: ${JSON.stringify({ ...searchBody, query: searchBody.query.substring(0, 30) + '...' })}`);

    const rawResult = await this.makeRequest<RawSearchResponse>('/api/search', 'POST', searchBody);

    logger.info(`Search API response: total_count=${rawResult.total_count}, results=${rawResult.results?.length || 0}, search_type=${rawResult.search_type}`);

    // Log raw API response fields for debugging
    if (rawResult.results && rawResult.results.length > 0) {
      const firstRaw = rawResult.results[0];
      logger.debug(`Raw API result fields: ${Object.keys(firstRaw).join(', ')}`);
      logger.debug(`Raw result: id=${firstRaw.id}, title=${firstRaw.title}, relevance=${firstRaw.relevance}, hasContent=${!!firstRaw.content}, contentLen=${firstRaw.content?.length || 0}`);
    }

    // Transform raw API response to normalized format
    const transformedResults: SearchResult[] = (rawResult.results || []).map((raw) => ({
      id: raw.id,
      // Content: use content field, or empty string if not provided
      content: raw.content || '',
      // Source name: prefer source_name, fall back to title
      source_name: raw.source_name || raw.title || 'Unknown',
      // Score: prefer score, fall back to relevance
      score: raw.score ?? raw.relevance ?? 0,
      metadata: raw.metadata,
    }));

    // Log transformation result
    if (transformedResults.length > 0) {
      logger.debug(`Transformed result: source=${transformedResults[0].source_name}, score=${transformedResults[0].score}, contentLen=${transformedResults[0].content.length}`);
    }

    return {
      results: transformedResults,
      total_count: rawResult.total_count,
      search_type: rawResult.search_type,
    };
  }

  /**
   * Get cached models or fetch fresh ones
   */
  private static async getCachedModels(): Promise<{ id: string; name: string; provider?: string }[]> {
    const now = Date.now();
    if (this.modelsCache && (now - this.modelsCacheTime) < this.MODELS_CACHE_TTL) {
      logger.debug(`Using cached models (${this.modelsCache.length} models)`);
      return this.modelsCache;
    }

    logger.info('Fetching models from Open Notebook API...');
    try {
      const rawModels = await this.makeRequest<Record<string, unknown>[]>('/api/models');
      logger.info(`Raw models response: ${JSON.stringify(rawModels.slice(0, 2))}`);

      // Map to expected format - API might use different field names
      const models = rawModels.map(m => ({
        id: String(m.id || ''),
        name: String(m.name || m.model_name || m.display_name || m.id || ''),
        provider: m.provider ? String(m.provider) : undefined,
      }));

      this.modelsCache = models;
      this.modelsCacheTime = now;
      logger.info(`Fetched ${models.length} models: ${models.map(m => `${m.name}(${m.id})`).join(', ')}`);
      return models;
    } catch (error) {
      logger.error('Failed to fetch models from Open Notebook:', error);
      return this.modelsCache || [];
    }
  }

  /**
   * Look up model ID by name. Searches for exact match first, then partial match.
   * @param modelName The model name to search for (e.g., "gemini-3-flash-preview")
   * @returns The full model ID (e.g., "model:abc123") or null if not found
   */
  private static async resolveModelId(modelName: string): Promise<string | null> {
    // Strip "model:" prefix if present - we need to look up by actual name
    const searchName = modelName.startsWith('model:') ? modelName.slice(6) : modelName;

    const models = await this.getCachedModels();
    if (models.length === 0) {
      logger.warn('No models available from Open Notebook API');
      return null;
    }

    const lowerName = searchName.toLowerCase();

    // Try exact match on ID first (in case they passed a valid model ID)
    let match = models.find(m => m.id === modelName || m.id === `model:${searchName}`);
    if (match) {
      logger.debug(`Model "${modelName}" resolved to "${match.id}" (ID match)`);
      return match.id;
    }

    // Try exact match on name
    match = models.find(m => m.name.toLowerCase() === lowerName);
    if (match) {
      logger.debug(`Model "${modelName}" resolved to "${match.id}" (exact name match: ${match.name})`);
      return match.id;
    }

    // Try partial match (model name contains the search term)
    match = models.find(m => m.name.toLowerCase().includes(lowerName));
    if (match) {
      logger.debug(`Model "${modelName}" resolved to "${match.id}" (partial match: ${match.name})`);
      return match.id;
    }

    // Try reverse partial match (search term contains model name)
    match = models.find(m => lowerName.includes(m.name.toLowerCase()));
    if (match) {
      logger.debug(`Model "${modelName}" resolved to "${match.id}" (reverse match: ${match.name})`);
      return match.id;
    }

    logger.warn(`Model "${modelName}" not found. Available: ${models.map(m => `${m.name}(${m.id})`).join(', ')}`);
    return null;
  }

  /**
   * Resolve model ID with fallback to first available model
   */
  private static async resolveModelIdWithFallback(modelName: string): Promise<string> {
    logger.info(`Resolving model: "${modelName}"`);

    const resolved = await this.resolveModelId(modelName);
    if (resolved) {
      logger.info(`Model "${modelName}" resolved to: ${resolved}`);
      return resolved;
    }

    // Fallback to first available model
    const models = await this.getCachedModels();
    logger.info(`Fallback: ${models.length} models available`);

    const firstModel = models[0];
    if (firstModel) {
      logger.warn(`Using fallback model: ${firstModel.name} (${firstModel.id})`);
      return firstModel.id;
    }

    // Last resort: return the original with model: prefix
    logger.error(`No models available from API, using original: model:${modelName}`);
    return `model:${modelName}`;
  }

  /**
   * Ask a question and get an answer (non-streaming)
   */
  static async ask(request: AskRequest): Promise<AskResponse> {
    logger.info(`Asking knowledge base: "${request.question.substring(0, 50)}..."`);

    // Resolve model names to actual model IDs from the API
    const defaultModel = config.openNotebookDefaultModel;
    const [strategyModel, answerModel, finalAnswerModel] = await Promise.all([
      this.resolveModelIdWithFallback(request.strategy_model || defaultModel),
      this.resolveModelIdWithFallback(request.answer_model || defaultModel),
      this.resolveModelIdWithFallback(request.final_answer_model || defaultModel),
    ]);

    logger.debug(`Ask models: strategy=${strategyModel}, answer=${answerModel}, final=${finalAnswerModel}`);

    return await this.makeRequest<AskResponse>('/api/search/ask/simple', 'POST', {
      question: request.question,
      strategy_model: strategyModel,
      answer_model: answerModel,
      final_answer_model: finalAnswerModel,
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

    // API requires context field (can be empty object)
    return this.makeRequest<ExecuteChatResponse>('/api/chat/execute', 'POST', {
      session_id: request.session_id,
      message: request.message,
      context: request.context || {},
      model_override: request.model_override,
    });
  }

  /**
   * Build context for a notebook
   */
  static async buildContext(
    notebookId: string,
    contextConfig?: Record<string, any>
  ): Promise<{ context: Record<string, any>; token_count: number; char_count: number }> {
    // API expects notebook_id in body, not just URL
    return this.makeRequest(`/api/notebooks/${notebookId}/context`, 'POST', {
      notebook_id: notebookId,
      ...contextConfig,
    });
  }

  /**
   * Get a single source by ID (includes full content)
   */
  static async getSource(sourceId: string): Promise<{ id: string; title: string; content?: string; type?: string }> {
    return this.makeRequest(`/api/sources/${sourceId}`);
  }

  /**
   * Fetch content for search results that are missing content.
   * Only fetches for top N results to avoid excessive API calls.
   */
  static async enrichSearchResultsWithContent(
    results: SearchResult[],
    maxToEnrich: number = 5
  ): Promise<SearchResult[]> {
    const resultsToEnrich = results.slice(0, maxToEnrich).filter((r) => !r.content || r.content.length === 0);

    if (resultsToEnrich.length === 0) {
      return results;
    }

    logger.info(`Enriching ${resultsToEnrich.length} search results with content`);

    // Fetch content for results missing it
    const enrichmentPromises = resultsToEnrich.map(async (result) => {
      try {
        // Extract source ID from result ID (format: "source:xyz" or just "xyz")
        const sourceId = result.id.startsWith('source:') ? result.id : `source:${result.id}`;
        const source = await this.getSource(sourceId);
        return { id: result.id, content: source.content || '' };
      } catch (error) {
        logger.warn(`Failed to fetch content for source ${result.id}:`, error);
        return { id: result.id, content: '' };
      }
    });

    const enrichments = await Promise.all(enrichmentPromises);
    const enrichmentMap = new Map(enrichments.map((e) => [e.id, e.content]));

    // Apply enrichments to results
    return results.map((result) => {
      const enrichedContent = enrichmentMap.get(result.id);
      if (enrichedContent !== undefined && (!result.content || result.content.length === 0)) {
        return { ...result, content: enrichedContent };
      }
      return result;
    });
  }

  /**
   * Get available models from Open Notebook
   */
  static async getModels(): Promise<{ id: string; name: string; provider?: string }[]> {
    try {
      return this.makeRequest('/api/models');
    } catch (error) {
      logger.warn('Failed to fetch models from Open Notebook:', error);
      return [];
    }
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
