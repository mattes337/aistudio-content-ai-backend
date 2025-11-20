import { pool } from '../config/database';
import { Channel, CreateChannelRequest, UpdateChannelRequest } from '../models/Channel';
import { MediaAsset, CreateMediaAssetRequest, UpdateMediaAssetRequest } from '../models/MediaAsset';
import { Article, CreateArticleRequest, UpdateArticleRequest } from '../models/Article';
import { Post, CreatePostRequest, UpdatePostRequest } from '../models/Post';
import { 
  KnowledgeSource, 
  KnowledgeChunk, 
  KnowledgeSourceChannel,
  CreateKnowledgeSourceRequest, 
  UpdateKnowledgeSourceRequest 
} from '../models/KnowledgeSource';
import { CreateRecipientRequest, UpdateRecipientRequest } from '../models/Recipient';
import { CreateNewsletterRequest, UpdateNewsletterRequest } from '../models/Newsletter';
import { 
  ChatSession, 
  ChatMessage, 
  ChatSessionWithMessages,
  CreateChatSessionRequest, 
  UpdateChatSessionRequest,
  CreateChatMessageRequest,
  ChatSessionChannel
} from '../models/Chat';

export class DatabaseService {
  // Channel operations
  static async createChannel(channelData: CreateChannelRequest): Promise<Channel> {
    const query = `
      INSERT INTO channels (name, url, type, platform_api, credentials, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      channelData.name,
      channelData.url,
      channelData.type,
      channelData.platformApi,
      JSON.stringify(channelData.credentials),
      JSON.stringify(channelData.metadata)
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getChannels(): Promise<Channel[]> {
    const result = await pool.query('SELECT * FROM channels ORDER BY created_at DESC');
    return result.rows;
  }

  static async getChannelById(id: string): Promise<Channel | null> {
    const result = await pool.query('SELECT * FROM channels WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateChannel(channelData: UpdateChannelRequest): Promise<Channel | null> {
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
    if (channelData.platformApi !== undefined) {
      setParts.push(`platform_api = $${paramCount++}`);
      values.push(channelData.platformApi);
    }
    if (channelData.credentials !== undefined) {
      setParts.push(`credentials = $${paramCount++}`);
      values.push(JSON.stringify(channelData.credentials));
    }
    if (channelData.metadata !== undefined) {
      setParts.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(channelData.metadata));
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
    return result.rows[0] || null;
  }

  static async deleteChannel(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM channels WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  // Media Asset operations
  static async createMediaAsset(assetData: CreateMediaAssetRequest): Promise<MediaAsset> {
    const query = `
      INSERT INTO media_assets (title, description, image_url, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      assetData.title,
      assetData.description || null,
      assetData.image_url,
      assetData.type
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getMediaAssets(type?: string): Promise<MediaAsset[]> {
    let query = 'SELECT * FROM media_assets';
    let params: any[] = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
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
    if (assetData.description !== undefined) {
      setParts.push(`description = $${paramCount++}`);
      values.push(assetData.description);
    }
    if (assetData.image_url !== undefined) {
      setParts.push(`image_url = $${paramCount++}`);
      values.push(assetData.image_url);
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
    return result.rowCount > 0;
  }

  // Article operations
  static async createArticle(articleData: CreateArticleRequest): Promise<Article> {
    // Auto-set status to draft if publish_date is not provided
    const status = articleData.publish_date ? articleData.status || 'draft' : 'draft';

    const query = `
      INSERT INTO articles (title, status, publish_date, channel_id, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      articleData.title,
      status,
      articleData.publish_date || null,
      articleData.channel_id,
      JSON.stringify(articleData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getArticles(status?: string): Promise<Article[]> {
    let query = `
      SELECT a.*, c.name as channel_name 
      FROM articles a 
      JOIN channels c ON a.channel_id = c.id
    `;
    let params: any[] = [];
    
    if (status) {
      query += ' WHERE a.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
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
    return result.rowCount > 0;
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

  static async getPosts(status?: string): Promise<Post[]> {
    let query = `
      SELECT p.*, a.title as linked_article_title 
      FROM posts p 
      LEFT JOIN articles a ON p.linked_article_id = a.id
    `;
    let params: any[] = [];
    
    if (status) {
      query += ' WHERE p.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
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
    return result.rowCount > 0;
  }

  // Knowledge Source operations
  static async createKnowledgeSource(sourceData: CreateKnowledgeSourceRequest): Promise<KnowledgeSource> {
    const query = `
      INSERT INTO knowledge_sources (name, type, source)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [
      sourceData.name,
      sourceData.type,
      sourceData.source
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getKnowledgeSources(): Promise<KnowledgeSource[]> {
    const result = await pool.query(`
      SELECT ks.*, 
             COUNT(kc.id) as chunk_count,
             SUM(CASE WHEN kc.embedding_status = 'complete' THEN 1 ELSE 0 END) as embedded_count
      FROM knowledge_sources ks
      LEFT JOIN knowledge_chunks kc ON ks.id = kc.knowledge_source_id
      GROUP BY ks.id
      ORDER BY ks.created_at DESC
    `);
    return result.rows;
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
      values.push(sourceData.name);
    }
    if (sourceData.type !== undefined) {
      setParts.push(`type = $${paramCount++}`);
      values.push(sourceData.type);
    }
    if (sourceData.source !== undefined) {
      setParts.push(`source = $${paramCount++}`);
      values.push(sourceData.source);
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
    const result = await pool.query('DELETE FROM knowledge_sources WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  static async getKnowledgeChunks(sourceId: string): Promise<KnowledgeChunk[]> {
    const result = await pool.query(
      'SELECT * FROM knowledge_chunks WHERE knowledge_source_id = $1 ORDER BY created_at',
      [sourceId]
    );
    return result.rows;
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
      INSERT INTO recipients (email, channel_id, status)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [
      recipientData.email,
      recipientData.channel_id,
      recipientData.status || 'subscribed'
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getRecipients(): Promise<any[]> {
    const result = await pool.query(`
      SELECT r.*, c.name as channel_name 
      FROM recipients r 
      JOIN channels c ON r.channel_id = c.id
      ORDER BY r.created_at DESC
    `);
    return result.rows;
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
    return result.rowCount > 0;
  }

  // Newsletter operations
  static async createNewsletter(newsletterData: CreateNewsletterRequest): Promise<any> {
    // Auto-set status to draft if publish_date is not provided
    const status = newsletterData.publish_date ? newsletterData.status || 'draft' : 'draft';

    const query = `
      INSERT INTO newsletters (subject, status, publish_date, channel_id, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      newsletterData.subject,
      status,
      newsletterData.publish_date || null,
      newsletterData.channel_id,
      JSON.stringify(newsletterData.data || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getNewsletters(): Promise<any[]> {
    const result = await pool.query('SELECT * FROM newsletters ORDER BY created_at DESC');
    return result.rows;
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
    return result.rowCount > 0;
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

  static async getChatSessions(): Promise<ChatSession[]> {
    const query = `
      SELECT cs.*, 
             COUNT(cm.id) as message_count,
             c.name as channel_names
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      LEFT JOIN chat_session_channels csc ON cs.id = csc.session_id
      LEFT JOIN channels c ON csc.channel_id = c.id
      GROUP BY cs.id
      ORDER BY cs.updated_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
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
    return result.rowCount > 0;
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

  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
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
    
    return responses[randomIndex];
  }
}
