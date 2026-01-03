import { pool } from '../config/database';
import type { Channel, CreateChannelRequest, UpdateChannelRequest, ChannelQueryOptions, PaginatedChannels, ChannelType, PlatformApi, ChannelListItem } from '../models/Channel';
import type { MediaAsset, CreateMediaAssetRequest, UpdateMediaAssetRequest, MediaAssetQueryOptions, PaginatedMediaAssets, MediaType, MediaAssetListItem } from '../models/MediaAsset';
import type { FileStatus } from '../models/MediaAsset';
import type { Article, CreateArticleRequest, UpdateArticleRequest, ArticleQueryOptions, PaginatedArticles, ArticleStatus, ArticleListItem } from '../models/Article';
import type { Post, CreatePostRequest, UpdatePostRequest, PostQueryOptions, PaginatedPosts, PostStatus, PostListItem } from '../models/Post';
import type {
  KnowledgeSource,
  KnowledgeChunk,
  KnowledgeSourceChannel,
  CreateKnowledgeSourceRequest,
  UpdateKnowledgeSourceRequest,
  KnowledgeSourceQueryOptions,
  PaginatedKnowledgeSources,
  KnowledgeSourceLog,
  LogStatus,
  PaginatedKnowledgeSourceLogs
} from '../models/KnowledgeSource';
import { deleteFile } from '../utils/fileUpload';
import type { CreateRecipientRequest, UpdateRecipientRequest, RecipientQueryOptions, PaginatedRecipients, RecipientStatus, RecipientListItem, Recipient } from '../models/Recipient';
import type { CreateNewsletterRequest, UpdateNewsletterRequest, NewsletterQueryOptions, PaginatedNewsletters, NewsletterStatus, NewsletterListItem, Newsletter } from '../models/Newsletter';
import type {
  ChatSession,
  ChatMessage,
  ChatSessionWithMessages,
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  CreateChatMessageRequest,
  ChatSessionChannel,
  ChatSessionQueryOptions,
  ChatMessageQueryOptions,
  PaginatedChatSessions,
  PaginatedChatMessages,
  ChatSessionListItem,
  ChatMessageListItem
} from '../models/Chat';

// Helper to sanitize strings for PostgreSQL by removing null bytes (0x00)
// which are invalid in PostgreSQL text fields
function sanitizeForPostgres(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.replace(/\x00/g, '');
}

export class DatabaseService {
  // Channel operations
  static async createChannel(channelData: CreateChannelRequest): Promise<Channel> {
    // Store data directly - new schema uses flat structure with credentials, settings, metadata
    const query = `
      INSERT INTO channels (name, url, type, platform_api, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const jsonString = channelData.data ? JSON.stringify(channelData.data) : '{}';
    console.log('Creating channel with JSON data:', jsonString);
    const values = [
      channelData.name,
      channelData.url,
      channelData.type,
      channelData.platform_api,
      jsonString
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    // Parse the data field for the return value
    return {
      ...row,
      data: this.parseChannelData(row.data)
    };
  }

  /**
   * Parse channel data from database (handles JSONB auto-parse and string JSON)
   */
  private static parseChannelData(data: any): any {
    if (!data) return {};
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn('Invalid JSON data in channel, using empty object:', error);
        return {};
      }
    }
    return {};
  }

  static async getChannels(options: ChannelQueryOptions = {}): Promise<PaginatedChannels> {
    const {
      search,
      type,
      platform_api,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['name', 'type', 'platform_api', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR url ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(type);
    }

    if (platform_api) {
      conditions.push(`platform_api = $${paramCount++}`);
      values.push(platform_api);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM channels
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return partial data (no credentials or data fields)
    const dataQuery = `
      SELECT id, name, url, type, platform_api, created_at, updated_at
      FROM channels
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as ChannelListItem[],
      total,
      limit,
      offset
    };
  }

  /**
   * Get all channels with full data (for internal use or backward compatibility)
   */
  static async getChannelsFull(): Promise<Channel[]> {
    const result = await pool.query('SELECT * FROM channels ORDER BY created_at DESC');
    return result.rows.map(row => ({
      ...row,
      data: this.parseChannelData(row.data)
    }));
  }

  static async getChannelById(id: string): Promise<Channel | null> {
    const result = await pool.query('SELECT * FROM channels WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      data: this.parseChannelData(row.data)
    };
  }

  static async getRawChannelById(id: string): Promise<any | null> {
    const query = 'SELECT * FROM channels WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) return null;

    return result.rows[0];
  }

  static async updateChannel(channelData: UpdateChannelRequest): Promise<Channel | null> {
    // First get the current channel to merge data
    const currentRawChannel = await this.getRawChannelById(channelData.id);
    if (!currentRawChannel) return null;

    const currentData = this.parseChannelData(currentRawChannel.data);

    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (channelData.name !== undefined) {
      setParts.push(`name = $${paramCount++}`);
      values.push(channelData.name);
    }
    if (channelData.url !== undefined) {
      setParts.push(`url = $${paramCount++}`);
      values.push(channelData.url);
    }
    if (channelData.type !== undefined) {
      setParts.push(`type = $${paramCount++}`);
      values.push(channelData.type);
    }
    if (channelData.platform_api !== undefined) {
      setParts.push(`platform_api = $${paramCount++}`);
      values.push(channelData.platform_api);
    }

    // Handle data updates - merge with existing data
    if (channelData.data !== undefined) {
      const mergedData = {
        ...currentData,
        ...channelData.data,
        // Deep merge for nested objects
        credentials: channelData.data.credentials !== undefined
          ? channelData.data.credentials
          : currentData.credentials,
        settings: channelData.data.settings !== undefined
          ? channelData.data.settings
          : currentData.settings,
        metadata: channelData.data.metadata !== undefined
          ? { ...currentData.metadata, ...channelData.data.metadata }
          : currentData.metadata
      };

      setParts.push(`data = $${paramCount++}`);
      const jsonString = JSON.stringify(mergedData);
      console.log('Storing JSON data for channel:', channelData.id, jsonString);
      values.push(jsonString);
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(channelData.id);

    const query = `
      UPDATE channels
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) return null;

    const updatedRow = result.rows[0];
    return {
      ...updatedRow,
      data: this.parseChannelData(updatedRow.data)
    };
  }

  static async deleteChannel(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM channels WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Media Asset operations
  static async createMediaAsset(assetData: CreateMediaAssetRequest): Promise<MediaAsset> {
    const query = `
      INSERT INTO media_assets (title, file_path, type, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      assetData.title,
      assetData.file_path,
      assetData.type,
      JSON.stringify(assetData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getMediaAssets(options: MediaAssetQueryOptions = {}): Promise<PaginatedMediaAssets> {
    const {
      search,
      type,
      file_status,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['title', 'type', 'file_status', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`title ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    if (type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(type);
    }

    if (file_status) {
      conditions.push(`file_status = $${paramCount++}`);
      values.push(file_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM media_assets
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return partial data (no 'data' field)
    const dataQuery = `
      SELECT id, title, type, file_path, file_status, created_at, updated_at
      FROM media_assets
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as MediaAssetListItem[],
      total,
      limit,
      offset
    };
  }

  static async getMediaAssetById(id: string): Promise<MediaAsset | null> {
    const result = await pool.query('SELECT * FROM media_assets WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateMediaAsset(assetData: UpdateMediaAssetRequest): Promise<MediaAsset | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (assetData.title !== undefined) {
      setParts.push(`title = $${paramCount++}`);
      values.push(assetData.title);
    }
    if (assetData.file_path !== undefined) {
      setParts.push(`file_path = $${paramCount++}`);
      values.push(assetData.file_path);
    }
    if (assetData.data !== undefined) {
      setParts.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(assetData.data));
    }
    if (assetData.type !== undefined) {
      setParts.push(`type = $${paramCount++}`);
      values.push(assetData.type);
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(assetData.id);

    const query = `
      UPDATE media_assets 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteMediaAsset(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM media_assets WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Article operations
  static async createArticle(articleData: CreateArticleRequest): Promise<Article> {
    // Auto-set status to draft if publish_date is not provided
    const status = articleData.publish_date ? articleData.status || 'draft' : 'draft';

    const query = `
      INSERT INTO articles (title, status, publish_date, channel_id, feature_image_id, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      articleData.title,
      status,
      articleData.publish_date || null,
      articleData.channel_id,
      articleData.feature_image_id || null,
      JSON.stringify(articleData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getArticles(options: ArticleQueryOptions = {}): Promise<PaginatedArticles> {
    const {
      search,
      status,
      channel_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['title', 'status', 'publish_date', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`a.title ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    if (status) {
      conditions.push(`a.status = $${paramCount++}`);
      values.push(status);
    }

    if (channel_id) {
      conditions.push(`a.channel_id = $${paramCount++}`);
      values.push(channel_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM articles a
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return partial data (no 'data' field)
    const dataQuery = `
      SELECT a.id, a.title, a.status, a.publish_date, a.channel_id,
             a.created_at, a.updated_at, c.name as channel_name,
             CASE WHEN ma.file_path IS NOT NULL THEN CONCAT('/api/files/', ma.file_path) END as feature_image_url,
             CASE WHEN ma.file_path IS NOT NULL THEN CONCAT('/api/files/', REGEXP_REPLACE(ma.file_path, '(\\.[^.]+)$', '_thumb\\1')) END as feature_image_thumbnail_url
      FROM articles a
      JOIN channels c ON a.channel_id = c.id
      LEFT JOIN media_assets ma ON a.feature_image_id = ma.id
      ${whereClause}
      ORDER BY a.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as ArticleListItem[],
      total,
      limit,
      offset
    };
  }

  static async getArticleById(id: string): Promise<Article | null> {
    const query = `
      SELECT a.*, c.name as channel_name 
      FROM articles a 
      JOIN channels c ON a.channel_id = c.id
      WHERE a.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updateArticle(articleData: UpdateArticleRequest): Promise<Article | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Auto-set status to draft if publish_date is being set to null
    if (articleData.publish_date !== undefined) {
      const status = articleData.publish_date ? articleData.status : 'draft';
      setParts.push(`status = $${paramCount++}`);
      values.push(status);
      setParts.push(`publish_date = $${paramCount++}`);
      values.push(articleData.publish_date);
    }

    if (articleData.title !== undefined) {
      setParts.push(`title = $${paramCount++}`);
      values.push(articleData.title);
    }

    if (articleData.status !== undefined && articleData.publish_date === undefined) {
      setParts.push(`status = $${paramCount++}`);
      values.push(articleData.status);
    }

    if (articleData.channel_id !== undefined) {
      setParts.push(`channel_id = $${paramCount++}`);
      values.push(articleData.channel_id);
    }

    if (articleData.feature_image_id !== undefined) {
      setParts.push(`feature_image_id = $${paramCount++}`);
      values.push(articleData.feature_image_id);
    }

    if (articleData.data !== undefined) {
      setParts.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(articleData.data));
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(articleData.id);

    const query = `
      UPDATE articles
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteArticle(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM articles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Post operations
  static async createPost(postData: CreatePostRequest): Promise<Post> {
    // Auto-set status to draft if publish_date is not provided
    const status = postData.publish_date ? postData.status || 'draft' : 'draft';

    const query = `
      INSERT INTO posts (status, publish_date, platform, linked_article_id, data, preview_file_path, file_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      status,
      postData.publish_date || null,
      postData.platform,
      postData.linked_article_id || null,
      JSON.stringify(postData.data || {}),
      postData.preview_file_path || null,
      postData.file_status || 'active'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getPosts(options: PostQueryOptions = {}): Promise<PaginatedPosts> {
    const {
      search,
      status,
      platform,
      linked_article_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['status', 'platform', 'publish_date', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`(p.platform ILIKE $${paramCount} OR a.title ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`p.status = $${paramCount++}`);
      values.push(status);
    }

    if (platform) {
      conditions.push(`p.platform = $${paramCount++}`);
      values.push(platform);
    }

    if (linked_article_id) {
      conditions.push(`p.linked_article_id = $${paramCount++}`);
      values.push(linked_article_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM posts p
      LEFT JOIN articles a ON p.linked_article_id = a.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return partial data (no 'data' field)
    const dataQuery = `
      SELECT p.id, p.status, p.publish_date, p.platform, p.linked_article_id,
             p.preview_file_path, p.file_status, p.created_at, p.updated_at,
             a.title as linked_article_title
      FROM posts p
      LEFT JOIN articles a ON p.linked_article_id = a.id
      ${whereClause}
      ORDER BY p.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as PostListItem[],
      total,
      limit,
      offset
    };
  }

  static async getPostById(id: string): Promise<Post | null> {
    const query = `
      SELECT p.*, a.title as linked_article_title 
      FROM posts p 
      LEFT JOIN articles a ON p.linked_article_id = a.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updatePost(postData: UpdatePostRequest): Promise<Post | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Auto-set status to draft if publish_date is being set to null
    if (postData.publish_date !== undefined) {
      const status = postData.publish_date ? postData.status : 'draft';
      setParts.push(`status = $${paramCount++}`);
      values.push(status);
      setParts.push(`publish_date = $${paramCount++}`);
      values.push(postData.publish_date);
    }

    if (postData.platform !== undefined) {
      setParts.push(`platform = $${paramCount++}`);
      values.push(postData.platform);
    }

    if (postData.linked_article_id !== undefined) {
      setParts.push(`linked_article_id = $${paramCount++}`);
      values.push(postData.linked_article_id);
    }

    if (postData.data !== undefined) {
      setParts.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(postData.data));
    }

    if (postData.preview_file_path !== undefined) {
      setParts.push(`preview_file_path = $${paramCount++}`);
      values.push(postData.preview_file_path);
    }

    if (postData.file_status !== undefined) {
      setParts.push(`file_status = $${paramCount++}`);
      values.push(postData.file_status);
    }

    if (postData.status !== undefined && postData.publish_date === undefined) {
      setParts.push(`status = $${paramCount++}`);
      values.push(postData.status);
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(postData.id);

    const query = `
      UPDATE posts
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deletePost(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Knowledge Source operations
  static async createKnowledgeSource(sourceData: CreateKnowledgeSourceRequest): Promise<KnowledgeSource> {
    const query = `
      INSERT INTO knowledge_sources (name, type, source_origin, status, folder_path, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      sanitizeForPostgres(sourceData.name),
      sanitizeForPostgres(sourceData.type),
      sanitizeForPostgres(sourceData.source_origin),
      'pending',
      sanitizeForPostgres(sourceData.folder_path),
      JSON.stringify(sourceData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getKnowledgeSources(options: KnowledgeSourceQueryOptions = {}): Promise<PaginatedKnowledgeSources> {
    const {
      folder_path,
      search,
      search_content = false,
      type,
      status,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 100,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(requestedLimit, 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['name', 'created_at', 'updated_at', 'type'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Always exclude soft-deleted items
    conditions.push(`ks.status != 'deleted'`);

    // Build WHERE conditions
    // Only filter by folder_path if a non-empty value is provided
    // Empty string or undefined = return all items
    if (folder_path !== undefined && folder_path !== '') {
      // Filter by exact folder path (exclusive - only items directly in folder)
      conditions.push(`ks.folder_path = $${paramCount++}`);
      values.push(folder_path);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      if (search_content) {
        // Search in name OR in chunk content
        conditions.push(`(ks.name ILIKE $${paramCount} OR EXISTS (
          SELECT 1 FROM knowledge_chunks kc_search
          WHERE kc_search.knowledge_source_id = ks.id
          AND kc_search.content ILIKE $${paramCount}
        ))`);
        paramCount++;
        values.push(searchPattern);
      } else {
        // Search only in name
        conditions.push(`ks.name ILIKE $${paramCount++}`);
        values.push(searchPattern);
      }
    }

    if (type) {
      conditions.push(`ks.type = $${paramCount++}`);
      values.push(type);
    }

    if (status) {
      conditions.push(`ks.status = $${paramCount++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(DISTINCT ks.id) as total
      FROM knowledge_sources ks
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination
    const dataQuery = `
      SELECT ks.*,
             COUNT(kc.id) as chunk_count,
             SUM(CASE WHEN kc.embedding_status = 'complete' THEN 1 ELSE 0 END) as embedded_count
      FROM knowledge_sources ks
      LEFT JOIN knowledge_chunks kc ON ks.id = kc.knowledge_source_id
      ${whereClause}
      GROUP BY ks.id
      ORDER BY ks.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows,
      total,
      limit,
      offset
    };
  }

  static async getKnowledgeSourceById(id: string): Promise<KnowledgeSource | null> {
    const result = await pool.query('SELECT * FROM knowledge_sources WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateKnowledgeSource(sourceData: UpdateKnowledgeSourceRequest): Promise<KnowledgeSource | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (sourceData.name !== undefined) {
      setParts.push(`name = $${paramCount++}`);
      values.push(sanitizeForPostgres(sourceData.name));
    }
    if (sourceData.type !== undefined) {
      setParts.push(`type = $${paramCount++}`);
      values.push(sanitizeForPostgres(sourceData.type));
    }
    if (sourceData.source_origin !== undefined) {
      setParts.push(`source_origin = $${paramCount++}`);
      values.push(sanitizeForPostgres(sourceData.source_origin));
    }
    if (sourceData.file_path !== undefined) {
      setParts.push(`file_path = $${paramCount++}`);
      values.push(sanitizeForPostgres(sourceData.file_path));
    }
    if (sourceData.folder_path !== undefined) {
      setParts.push(`folder_path = $${paramCount++}`);
      values.push(sanitizeForPostgres(sourceData.folder_path));
    }
    if (sourceData.data !== undefined) {
      setParts.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(sourceData.data));
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(sourceData.id);

    const query = `
      UPDATE knowledge_sources 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteKnowledgeSource(id: string): Promise<boolean> {
    // Soft delete: mark status as deleted
    // Files will be cleaned up by background process after 1 day
    const result = await pool.query(
      `UPDATE knowledge_sources
       SET status = 'deleted', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async getKnowledgeChunks(sourceId: string): Promise<KnowledgeChunk[]> {
    const result = await pool.query(
      'SELECT * FROM knowledge_chunks WHERE knowledge_source_id = $1 ORDER BY created_at',
      [sourceId]
    );
    return result.rows;
  }

  static async getKnowledgeSourceFolders(): Promise<{ folder_path: string | null; item_count: number }[]> {
    const result = await pool.query(`
      SELECT folder_path, COUNT(*) as item_count
      FROM knowledge_sources
      WHERE status != 'deleted'
      GROUP BY folder_path
      ORDER BY folder_path NULLS FIRST
    `);
    return result.rows.map(row => ({
      folder_path: row.folder_path,
      item_count: parseInt(row.item_count, 10)
    }));
  }

  // Knowledge Source Channel operations (for Open Notebook sync)
  static async getKnowledgeSourceChannels(sourceId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT channel_id FROM knowledge_source_channels WHERE knowledge_source_id = $1',
      [sourceId]
    );
    return result.rows.map(row => row.channel_id);
  }

  static async getKnowledgeSourcesForSync(): Promise<(KnowledgeSource & { channel_ids: string[] })[]> {
    // Get all knowledge sources that are not in error state and not deleted
    const sourcesResult = await pool.query(`
      SELECT ks.*
      FROM knowledge_sources ks
      WHERE ks.status != 'error'
        AND ks.status != 'deleted'
      ORDER BY ks.created_at
    `);

    // Get channel associations for all sources
    const channelsResult = await pool.query(`
      SELECT knowledge_source_id, channel_id
      FROM knowledge_source_channels
    `);

    // Build a map of source_id -> channel_ids
    const channelMap = new Map<string, string[]>();
    for (const row of channelsResult.rows) {
      const channels = channelMap.get(row.knowledge_source_id) || [];
      channels.push(row.channel_id);
      channelMap.set(row.knowledge_source_id, channels);
    }

    // Combine sources with their channels
    return sourcesResult.rows.map(source => ({
      ...source,
      channel_ids: channelMap.get(source.id) || []
    }));
  }

  static async getDeletedKnowledgeSources(): Promise<KnowledgeSource[]> {
    const result = await pool.query(`
      SELECT * FROM knowledge_sources
      WHERE status = 'deleted'
    `);
    return result.rows;
  }

  static async getDeletedKnowledgeSourcesForCleanup(delayHours: number): Promise<KnowledgeSource[]> {
    const result = await pool.query(`
      SELECT * FROM knowledge_sources
      WHERE status = 'deleted'
        AND updated_at < NOW() - INTERVAL '1 hour' * $1
    `, [delayHours]);
    return result.rows;
  }

  static async hardDeleteKnowledgeSource(id: string): Promise<boolean> {
    // First delete associated chunks
    await pool.query('DELETE FROM knowledge_chunks WHERE knowledge_source_id = $1', [id]);
    // Then delete channel associations
    await pool.query('DELETE FROM knowledge_source_channels WHERE knowledge_source_id = $1', [id]);
    // Finally delete the knowledge source
    const result = await pool.query('DELETE FROM knowledge_sources WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async updateKnowledgeSourceSyncStatus(
    id: string,
    syncedAt: Date,
    notebookSourceIds: Record<string, string>
  ): Promise<void> {
    await pool.query(`
      UPDATE knowledge_sources
      SET open_notebook_synced_at = $1,
          open_notebook_source_ids = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [syncedAt, JSON.stringify(notebookSourceIds), id]);
  }

  static async clearKnowledgeSourceSyncStatus(id: string): Promise<void> {
    await pool.query(`
      UPDATE knowledge_sources
      SET open_notebook_synced_at = NULL,
          open_notebook_source_ids = '{}',
          updated_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  // Vector search operations
  static async searchSimilarContent(queryVector: number[], limit: number = 10, threshold: number = 0.7): Promise<any[]> {
    const sql = `
      SELECT kc.content, ks.name as source_name, 1 - (kc.embedding <=> $1) as similarity
      FROM knowledge_chunks kc
      JOIN knowledge_sources ks ON kc.knowledge_source_id = ks.id
      WHERE kc.embedding_status = 'complete'
        AND 1 - (kc.embedding <=> $1) > $2
      ORDER BY similarity DESC
      LIMIT $3
    `;

    const result = await pool.query(sql, [`[${queryVector.join(',')}]`, threshold, limit]);
    return result.rows;
  }

  // Recipient operations
  static async createRecipient(recipientData: CreateRecipientRequest): Promise<any> {
    const query = `
      INSERT INTO recipients (email, channel_id, status, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      recipientData.email,
      recipientData.channel_id,
      recipientData.status || 'subscribed',
      JSON.stringify(recipientData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getRecipients(options: RecipientQueryOptions = {}): Promise<PaginatedRecipients> {
    const {
      search,
      status,
      channel_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['email', 'status', 'registration_date', 'last_notification_date', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`r.email ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    if (status) {
      conditions.push(`r.status = $${paramCount++}`);
      values.push(status);
    }

    if (channel_id) {
      conditions.push(`r.channel_id = $${paramCount++}`);
      values.push(channel_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM recipients r
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return partial data (no 'data' field)
    const dataQuery = `
      SELECT r.id, r.email, r.channel_id, r.registration_date, r.last_notification_date,
             r.status, r.created_at, r.updated_at, c.name as channel_name
      FROM recipients r
      JOIN channels c ON r.channel_id = c.id
      ${whereClause}
      ORDER BY r.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as RecipientListItem[],
      total,
      limit,
      offset
    };
  }

  static async getRecipientById(id: string): Promise<any | null> {
    const query = `
      SELECT r.*, c.name as channel_name 
      FROM recipients r 
      JOIN channels c ON r.channel_id = c.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updateRecipient(recipientData: UpdateRecipientRequest): Promise<any | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (recipientData.email !== undefined) {
      setParts.push(`email = $${paramCount++}`);
      values.push(recipientData.email);
    }
    if (recipientData.channel_id !== undefined) {
      setParts.push(`channel_id = $${paramCount++}`);
      values.push(recipientData.channel_id);
    }
    if (recipientData.status !== undefined) {
      setParts.push(`status = $${paramCount++}`);
      values.push(recipientData.status);
    }
    if (recipientData.last_notification_date !== undefined) {
      setParts.push(`last_notification_date = $${paramCount++}`);
      values.push(recipientData.last_notification_date);
    }
    if (recipientData.data !== undefined) {
      setParts.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(recipientData.data));
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(recipientData.id);

    const query = `
      UPDATE recipients
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteRecipient(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM recipients WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Newsletter operations
  static async createNewsletter(newsletterData: CreateNewsletterRequest): Promise<any> {
    // Auto-set status to draft if publish_date is not provided
    const status = newsletterData.publish_date ? newsletterData.status || 'draft' : 'draft';

    const query = `
      INSERT INTO newsletters (subject, status, publish_date, channel_id, feature_image_id, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      newsletterData.subject,
      status,
      newsletterData.publish_date || null,
      newsletterData.channel_id,
      newsletterData.feature_image_id || null,
      JSON.stringify(newsletterData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getNewsletters(options: NewsletterQueryOptions = {}): Promise<PaginatedNewsletters> {
    const {
      search,
      status,
      channel_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['subject', 'status', 'publish_date', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`n.subject ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    if (status) {
      conditions.push(`n.status = $${paramCount++}`);
      values.push(status);
    }

    if (channel_id) {
      conditions.push(`n.channel_id = $${paramCount++}`);
      values.push(channel_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM newsletters n
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return partial data (no 'data' field)
    const dataQuery = `
      SELECT n.id, n.subject, n.status, n.publish_date, n.channel_id,
             n.created_at, n.updated_at, c.name as channel_name,
             CASE WHEN ma.file_path IS NOT NULL THEN CONCAT('/api/files/', ma.file_path) END as feature_image_url,
             CASE WHEN ma.file_path IS NOT NULL THEN CONCAT('/api/files/', REGEXP_REPLACE(ma.file_path, '(\\.[^.]+)$', '_thumb\\1')) END as feature_image_thumbnail_url
      FROM newsletters n
      LEFT JOIN channels c ON n.channel_id = c.id
      LEFT JOIN media_assets ma ON n.feature_image_id = ma.id
      ${whereClause}
      ORDER BY n.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as NewsletterListItem[],
      total,
      limit,
      offset
    };
  }

  static async getNewsletterById(id: string): Promise<any | null> {
    const result = await pool.query('SELECT * FROM newsletters WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateNewsletter(newsletterData: UpdateNewsletterRequest): Promise<any | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Auto-set status to draft if publish_date is being set to null
    if (newsletterData.publish_date !== undefined) {
      const status = newsletterData.publish_date ? newsletterData.status : 'draft';
      setParts.push(`status = $${paramCount++}`);
      values.push(status);
      setParts.push(`publish_date = $${paramCount++}`);
      values.push(newsletterData.publish_date);
    }

    if (newsletterData.subject !== undefined) {
      setParts.push(`subject = $${paramCount++}`);
      values.push(newsletterData.subject);
    }

    if (newsletterData.status !== undefined && newsletterData.publish_date === undefined) {
      setParts.push(`status = $${paramCount++}`);
      values.push(newsletterData.status);
    }

    if (newsletterData.channel_id !== undefined) {
      setParts.push(`channel_id = $${paramCount++}`);
      values.push(newsletterData.channel_id);
    }

    if (newsletterData.feature_image_id !== undefined) {
      setParts.push(`feature_image_id = $${paramCount++}`);
      values.push(newsletterData.feature_image_id);
    }

    if (newsletterData.data !== undefined) {
      setParts.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(newsletterData.data));
    }

    setParts.push(`updated_at = NOW()`);
    values.push(newsletterData.id);

    const query = `
      UPDATE newsletters
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteNewsletter(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM newsletters WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Chat Session operations
  static async createChatSession(sessionData: CreateChatSessionRequest): Promise<ChatSession> {
    const query = `
      INSERT INTO chat_sessions (title)
      VALUES ($1)
      RETURNING *
    `;
    const values = [sessionData.title || 'New Chat Session'];

    const result = await pool.query(query, values);
    const session = result.rows[0];

    // Add channel associations if provided
    if (sessionData.channel_ids && sessionData.channel_ids.length > 0) {
      await this.addChannelsToSession(session.id, sessionData.channel_ids);
    }

    return session;
  }

  static async getChatSessions(options: ChatSessionQueryOptions = {}): Promise<PaginatedChatSessions> {
    const {
      search,
      sort_by = 'updated_at',
      sort_order = 'desc',
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['title', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'updated_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

    const values: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`cs.title ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for total (need to count distinct sessions)
    const countQuery = `
      SELECT COUNT(DISTINCT cs.id) as total
      FROM chat_sessions cs
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination
    const dataQuery = `
      SELECT cs.id, cs.title, cs.created_at, cs.updated_at,
             COUNT(cm.id) as message_count,
             STRING_AGG(DISTINCT c.name, ', ') as channel_names
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      LEFT JOIN chat_session_channels csc ON cs.id = csc.session_id
      LEFT JOIN channels c ON csc.channel_id = c.id
      ${whereClause}
      GROUP BY cs.id
      ORDER BY cs.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as ChatSessionListItem[],
      total,
      limit,
      offset
    };
  }

  static async getChatSessionById(id: string): Promise<ChatSessionWithMessages | null> {
    // Get session details
    const sessionQuery = 'SELECT * FROM chat_sessions WHERE id = $1';
    const sessionResult = await pool.query(sessionQuery, [id]);

    if (!sessionResult.rows[0]) {
      return null;
    }

    const session = sessionResult.rows[0];

    // Get messages for this session
    const messagesQuery = `
      SELECT * FROM chat_messages 
      WHERE session_id = $1 
      ORDER BY created_at ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [id]);

    // Get associated channels
    const channelsQuery = `
      SELECT c.id, c.name, c.type
      FROM chat_session_channels csc
      JOIN channels c ON csc.channel_id = c.id
      WHERE csc.session_id = $1
    `;
    const channelsResult = await pool.query(channelsQuery, [id]);

    return {
      ...session,
      messages: messagesResult.rows,
      channels: channelsResult.rows.map(ch => ch.id)
    };
  }

  static async updateChatSession(sessionData: UpdateChatSessionRequest): Promise<ChatSession | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (sessionData.title !== undefined) {
      setParts.push(`title = $${paramCount++}`);
      values.push(sessionData.title);
    }

    setParts.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(sessionData.id);

    const query = `
      UPDATE chat_sessions 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const session = result.rows[0] || null;

    // Update channel associations if provided
    if (session && sessionData.channel_ids !== undefined) {
      await this.updateSessionChannels(session.id, sessionData.channel_ids);
    }

    return session;
  }

  static async deleteChatSession(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM chat_sessions WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Chat Message operations
  static async createChatMessage(messageData: CreateChatMessageRequest): Promise<ChatMessage> {
    const query = `
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      messageData.session_id,
      messageData.role,
      messageData.content
    ];

    const result = await pool.query(query, values);

    // Update the session's updated_at timestamp
    await pool.query(
      'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
      [messageData.session_id]
    );

    return result.rows[0];
  }

  static async getChatMessages(sessionId: string, options: ChatMessageQueryOptions = {}): Promise<PaginatedChatMessages> {
    const {
      search,
      role,
      sort_by = 'created_at',
      sort_order = 'asc', // Default to asc for messages (oldest first)
      limit: requestedLimit = 50,
      offset = 0
    } = options;

    // Enforce max limit of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    const safeSortOrder = sort_order === 'desc' ? 'DESC' : 'ASC';

    const values: any[] = [sessionId];
    const conditions: string[] = ['session_id = $1'];
    let paramCount = 2;

    // Build WHERE conditions
    if (search) {
      conditions.push(`content ILIKE $${paramCount++}`);
      values.push(`%${search}%`);
    }

    if (role) {
      conditions.push(`role = $${paramCount++}`);
      values.push(role);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM chat_messages
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with pagination - return content preview instead of full content
    const dataQuery = `
      SELECT id, session_id, role,
             LEFT(content, 200) as content_preview,
             created_at
      FROM chat_messages
      ${whereClause}
      ORDER BY created_at ${safeSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows as ChatMessageListItem[],
      total,
      limit,
      offset
    };
  }

  /**
   * Get all messages for a session with full content (for individual session view)
   */
  static async getChatMessagesFull(sessionId: string): Promise<ChatMessage[]> {
    const query = `
      SELECT * FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId]);
    return result.rows;
  }

  // Chat Session Channels operations
  static async addChannelsToSession(sessionId: string, channelIds: string[]): Promise<void> {
    if (channelIds.length === 0) return;

    const values = channelIds.map((channelId, index) =>
      `($1, $${index + 2})`
    ).join(', ');

    const query = `
      INSERT INTO chat_session_channels (session_id, channel_id)
      VALUES ${values}
      ON CONFLICT DO NOTHING
    `;

    await pool.query(query, [sessionId, ...channelIds]);
  }

  static async removeChannelsFromSession(sessionId: string, channelIds: string[]): Promise<void> {
    if (channelIds.length === 0) return;

    const query = `
      DELETE FROM chat_session_channels 
      WHERE session_id = $1 AND channel_id = ANY($2)
    `;

    await pool.query(query, [sessionId, channelIds]);
  }

  static async updateSessionChannels(sessionId: string, channelIds: string[]): Promise<void> {
    // Remove all existing associations
    await pool.query(
      'DELETE FROM chat_session_channels WHERE session_id = $1',
      [sessionId]
    );

    // Add new associations
    await this.addChannelsToSession(sessionId, channelIds);
  }

  static async getSessionChannels(sessionId: string): Promise<string[]> {
    const query = `
      SELECT channel_id FROM chat_session_channels 
      WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);
    return result.rows.map(row => row.channel_id);
  }

  // Simulated AI response endpoint
  static async generateSimulatedResponse(prompt: string, context?: string): Promise<string> {
    // Simple simulated responses based on common patterns
    const responses = [
      `Based on your question about "${prompt}", I can provide you with some insights. This is a simulated response that would normally use AI to analyze your content and provide relevant information.`,
      `That's an interesting question about "${prompt}". In a real implementation, I would search through your knowledge bases and provide a comprehensive answer based on your available content.`,
      `Regarding "${prompt}", I understand you're looking for assistance. This simulated response demonstrates how the chat system would work with actual AI integration.`,
      `I see you're asking about "${prompt}". Let me help you with that. This is a mock response showing the chat functionality in action.`
    ];

    // Add some context awareness if available
    if (context) {
      responses.push(
        `Based on the context from your channels and knowledge sources, regarding "${prompt}": ${context}. This is a simulated response that would normally incorporate your actual data.`
      );
    }

    // Randomly select a response
    const randomIndex = Math.floor(Math.random() * responses.length);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return responses[randomIndex]!;
  }

  // Knowledge Source Log operations
  static async createKnowledgeSourceLog(
    sourceId: string,
    eventType: string,
    status: LogStatus,
    message: string,
    metadata?: Record<string, any>
  ): Promise<KnowledgeSourceLog> {
    const query = `
      INSERT INTO knowledge_source_logs
      (knowledge_source_id, event_type, status, message, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      sourceId,
      eventType,
      status,
      message,
      JSON.stringify(metadata ?? {})
    ]);
    return result.rows[0];
  }

  static async getKnowledgeSourceLogs(
    sourceId: string,
    limit = 50,
    offset = 0
  ): Promise<PaginatedKnowledgeSourceLogs> {
    const countQuery = `
      SELECT COUNT(*) FROM knowledge_source_logs
      WHERE knowledge_source_id = $1
    `;
    const logsQuery = `
      SELECT * FROM knowledge_source_logs
      WHERE knowledge_source_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const [countResult, logsResult] = await Promise.all([
      pool.query(countQuery, [sourceId]),
      pool.query(logsQuery, [sourceId, limit, offset])
    ]);

    return {
      data: logsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    };
  }

  static async deleteKnowledgeSourceLogs(sourceId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM knowledge_source_logs WHERE knowledge_source_id = $1',
      [sourceId]
    );
    return result.rowCount ?? 0;
  }
}
