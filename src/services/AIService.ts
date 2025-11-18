import { DatabaseService } from './DatabaseService';
import { loadEnvConfig } from '../utils/env';
import logger from '../utils/logger';
import fetch from 'node-fetch';

const config = loadEnvConfig();

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export class AIService {
  private static readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private static readonly TEXT_MODEL = 'gemini-1.5-flash';
  private static readonly VISION_MODEL = 'gemini-1.5-flash';
  private static readonly EMBEDDING_MODEL = 'text-embedding-004';

  private static async makeGeminiRequest(
    endpoint: string,
    requestBody: any,
    method: string = 'POST'
  ): Promise<any> {
    if (!config.geminiApiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const url = `${this.GEMINI_API_URL}/${endpoint}?key=${config.geminiApiKey}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(requestBody) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private static createPrompt(systemPrompt: string, userPrompt: string): string {
    return `${systemPrompt}\n\nUser: ${userPrompt}\nAssistant:`;
  }

  static async generateArticleContent(prompt: string, currentContent?: string): Promise<string> {
    const systemPrompt = `You are a professional content writer. Generate high-quality, engaging article content based on the user's prompt. 
    ${currentContent ? `The current content is: "${currentContent}". Please revise or expand upon it.` : 'Create new content from scratch.'}
    The content should be well-structured, informative, and engaging. Use proper formatting with paragraphs and headings where appropriate.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: this.createPrompt(systemPrompt, prompt)
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      } as GenerationConfig
    };

    const response: GeminiResponse = await this.makeGeminiRequest(
      `${this.TEXT_MODEL}:generateContent`,
      requestBody
    );

    return response.candidates[0]?.content?.parts[0]?.text || 'No content generated';
  }

  static async generateArticleTitle(content: string): Promise<string> {
    const systemPrompt = 'You are a professional content strategist. Generate compelling, SEO-friendly titles for articles based on the provided content. The title should be attention-grabbing, accurately reflect the content, and be optimal for search engines.';
    
    const requestBody = {
      contents: [{
        parts: [{
          text: this.createPrompt(systemPrompt, `Generate a title for this article content: ${content}`)
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 256,
      } as GenerationConfig
    };

    const response: GeminiResponse = await this.makeGeminiRequest(
      `${this.TEXT_MODEL}:generateContent`,
      requestBody
    );

    return response.candidates[0]?.content?.parts[0]?.text || 'Untitled Article';
  }

  static async generateArticleMetadata(content: string): Promise<{
    title: string;
    description: string;
    keywords: string[];
    slug: string;
  }> {
    const systemPrompt = 'You are an SEO expert. Generate comprehensive metadata for the given article content. Return the response as a JSON object with the following fields: title (string), description (string, 150-160 characters), keywords (array of strings), slug (URL-friendly string).';

    const requestBody = {
      contents: [{
        parts: [{
          text: this.createPrompt(systemPrompt, `Generate metadata for this article content: ${content}`)
        }]
      }],
      generationConfig: {
        temperature: 0.6,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      } as GenerationConfig
    };

    const response: GeminiResponse = await this.makeGeminiRequest(
      `${this.TEXT_MODEL}:generateContent`,
      requestBody
    );

    try {
      const text = response.candidates[0]?.content?.parts[0]?.text || '{}';
      return JSON.parse(text);
    } catch (error) {
      logger.error('Error parsing AI metadata response:', error);
      return {
        title: 'Generated Article',
        description: 'An informative article about various topics.',
        keywords: ['article', 'content'],
        slug: 'generated-article'
      };
    }
  }

  static async generatePostDetails(prompt: string, currentCaption?: string): Promise<{
    caption: string;
    altText: string;
    tags: string[];
  }> {
    const systemPrompt = `You are a social media expert. Generate engaging social media post content. 
    ${currentCaption ? `The current caption is: "${currentCaption}". Please revise or improve it.` : 'Create a new caption from scratch.'}
    Generate a compelling caption, appropriate alt text for accessibility, and relevant hashtags. 
    Return the response as a JSON object with: caption (string), altText (string), tags (array of hashtags without # symbol).`;

    const requestBody = {
      contents: [{
        parts: [{
          text: this.createPrompt(systemPrompt, prompt)
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      } as GenerationConfig
    };

    const response: GeminiResponse = await this.makeGeminiRequest(
      `${this.TEXT_MODEL}:generateContent`,
      requestBody
    );

    try {
      const text = response.candidates[0]?.content?.parts[0]?.text || '{}';
      return JSON.parse(text);
    } catch (error) {
      logger.error('Error parsing AI post details response:', error);
      return {
        caption: prompt,
        altText: 'Generated social media image',
        tags: ['social', 'media']
      };
    }
  }

  static async generateImage(prompt: string, aspectRatio: string = '1:1'): Promise<{
    imageUrl: string;
    base64Image: string;
    mimeType: string;
  }> {
    // Note: Gemini 1.5 Flash doesn't support image generation yet
    // This is a placeholder implementation that would need to be integrated
    // with a service that supports image generation (like DALL-E, Midjourney, or Stable Diffusion)
    
    logger.warn('Image generation not yet implemented - returning placeholder');
    
    return {
      imageUrl: 'https://via.placeholder.com/512x512.png?text=Generated+Image',
      base64Image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      mimeType: 'image/png'
    };
  }

  static async editImage(prompt: string, base64ImageData: string, mimeType: string): Promise<{
    imageUrl: string;
    base64Image: string;
  }> {
    // This would implement image editing functionality
    // For now, return the original image as a placeholder
    
    logger.warn('Image editing not yet implemented - returning original image');
    
    return {
      imageUrl: 'data:' + mimeType + ';base64,' + base64ImageData,
      base64Image: base64ImageData
    };
  }

  static async generateBulkContent(
    articleCount: number,
    postCount: number,
    knowledgeSummary: string
  ): Promise<{
    articles: any[];
    posts: any[];
  }> {
    const systemPrompt = `You are a content strategist generating multiple pieces of content based on the provided knowledge summary. 
    Generate ${articleCount} articles and ${postCount} social media posts. 
    Return the response as a JSON object with: articles (array of objects with title and content), posts (array of objects with caption and platform).`;

    const requestBody = {
      contents: [{
        parts: [{
          text: this.createPrompt(systemPrompt, `Generate content based on: ${knowledgeSummary}`)
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      } as GenerationConfig
    };

    const response: GeminiResponse = await this.makeGeminiRequest(
      `${this.TEXT_MODEL}:generateContent`,
      requestBody
    );

    try {
      const text = response.candidates[0]?.content?.parts[0]?.text || '{}';
      return JSON.parse(text);
    } catch (error) {
      logger.error('Error parsing AI bulk content response:', error);
      return {
        articles: [],
        posts: []
      };
    }
  }

  static async getEmbedding(text: string): Promise<number[]> {
    const requestBody = {
      model: `models/${this.EMBEDDING_MODEL}`,
      content: {
        parts: [{
          text: text
        }]
      }
    };

    const response = await this.makeGeminiRequest(
      `${this.EMBEDDING_MODEL}:embedContent`,
      requestBody
    );

    return response.embedding?.values || [];
  }

  static async searchSimilarContent(
    queryVector: number[], 
    limit: number = 10, 
    threshold: number = 0.7
  ): Promise<any[]> {
    return await DatabaseService.searchSimilarContent(queryVector, limit, threshold);
  }

  static async processKnowledgeSource(sourceId: string): Promise<void> {
    // TODO: Implement knowledge source processing
    // This would involve:
    // 1. Fetching the source content
    // 2. Chunking the content
    // 3. Generating embeddings for each chunk
    // 4. Storing the chunks and embeddings in the database
    
    logger.info(`Processing knowledge source: ${sourceId}`);
    
    // Placeholder implementation
    const source = await DatabaseService.getKnowledgeSourceById(sourceId);
    if (!source) {
      throw new Error('Knowledge source not found');
    }

    // In a real implementation, this would:
    // - Download and extract content from various sources (PDF, website, etc.)
    // - Chunk the content into manageable pieces
    // - Generate embeddings using the getEmbedding method
    // - Store chunks and embeddings in the knowledge_chunks table
    
    logger.info(`Knowledge source ${sourceId} processing completed`);
  }
}
