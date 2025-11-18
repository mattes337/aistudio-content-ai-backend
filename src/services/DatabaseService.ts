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
    const query = `
      INSERT INTO articles (
        title, content, title_image_url, title_image_alt, inline_images,
        status, publish_date, author, excerpt, categories, tags, seo, channel_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      articleData.title,
      articleData.content,
      articleData.title_image_url || null,
      articleData.title_image_alt || null,
      JSON.stringify(articleData.inline_images || []),
      articleData.status,
      articleData.publish_date || null,
      articleData.author || null,
      articleData.excerpt || null,
      articleData.categories || [],
      articleData.tags || [],
      JSON.stringify(articleData.seo || {}),
      articleData.channel_id
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

    const updateFields = [
      'title', 'content', 'title_image_url', 'title_image_alt', 'inline_images',
      'status', 'publish_date', 'author', 'excerpt', 'categories', 'tags', 'seo', 'channel_id'
    ];

    updateFields.forEach(field => {
      const value = (articleData as any)[field];
      if (value !== undefined) {
        setParts.push(`${field} = $${paramCount++}`);
        if (field === 'inline_images' || field === 'seo') {
          values.push(JSON.stringify(value));
        } else if (field === 'categories' || field === 'tags') {
          values.push(value);
        } else {
          values.push(value || null);
        }
      }
    });

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
    const query = `
      INSERT INTO posts (
        content, background_image_url, base_background_image_url, overlays,
        status, publish_date, platform, tags, location, tagged_users, alt_text,
        disable_comments, hide_likes, linked_article_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      postData.content,
      postData.background_image_url,
      postData.base_background_image_url || null,
      JSON.stringify(postData.overlays || []),
      postData.status,
      postData.publish_date || null,
      postData.platform,
      postData.tags || [],
      postData.location || null,
      postData.tagged_users || [],
      postData.alt_text || null,
      postData.disable_comments || false,
      postData.hide_likes || false,
      postData.linked_article_id || null
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

    const updateFields = [
      'content', 'background_image_url', 'base_background_image_url', 'overlays',
      'status', 'publish_date', 'platform', 'tags', 'location', 'tagged_users', 'alt_text',
      'disable_comments', 'hide_likes', 'linked_article_id'
    ];

    updateFields.forEach(field => {
      const value = (postData as any)[field];
      if (value !== undefined) {
        setParts.push(`${field} = $${paramCount++}`);
        if (field === 'overlays') {
          values.push(JSON.stringify(value));
        } else if (field === 'tags' || field === 'tagged_users') {
          values.push(value);
        } else if (typeof value === 'boolean') {
          values.push(value);
        } else {
          values.push(value || null);
        }
      }
    });

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
}
