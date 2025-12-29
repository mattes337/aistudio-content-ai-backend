import { z } from 'zod/v3';

// ============== Model Configuration ==============

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface ModelConfig {
  model: GeminiModel;
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: ThinkingLevel;
}

// ============== Content Types ==============

export type ContentType = 'article' | 'post' | 'newsletter';

// ============== Zod Schemas for Structured Output ==============

export const RefineContentResultSchema = z.object({
  content: z.string().describe('The full updated content text/HTML'),
  chatResponse: z.string().describe('A brief reply to the user about changes made'),
});
export type RefineContentResult = z.infer<typeof RefineContentResultSchema>;

export const TitleSchema = z.object({
  title: z.string().describe('SEO-friendly title, max 60 characters'),
});
export type TitleResult = z.infer<typeof TitleSchema>;

export const SubjectSchema = z.object({
  subject: z.string().describe('Compelling email subject line'),
});
export type SubjectResult = z.infer<typeof SubjectSchema>;

export const SEOSchema = z.object({
  title: z.string().describe('SEO title, max 60 chars'),
  description: z.string().describe('Meta description, max 160 chars'),
  keywords: z.string().describe('Comma-separated keywords'),
  slug: z.string().describe('URL-friendly slug'),
});

export const MetadataSchema = z.object({
  seo: SEOSchema,
  excerpt: z.string().describe('Short summary, approx 150 chars'),
});
export type MetadataResult = z.infer<typeof MetadataSchema>;

export const ExcerptSchema = z.object({
  excerpt: z.string().describe('Short summary of content'),
});
export type ExcerptResult = z.infer<typeof ExcerptSchema>;

export const PreviewTextSchema = z.object({
  previewText: z.string().describe('Email preheader text'),
});
export type PreviewTextResult = z.infer<typeof PreviewTextSchema>;

export const PostDetailsSchema = z.object({
  content: z.string().describe('Caption text with emojis'),
  altText: z.string().describe('Accessibility description for image'),
  tags: z.array(z.string()).describe('Hashtags without # symbol'),
});
export type PostDetailsResult = z.infer<typeof PostDetailsSchema>;

export const ArticleMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  slug: z.string(),
});
export type ArticleMetadata = z.infer<typeof ArticleMetadataSchema>;

export const BulkArticleSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const BulkPostSchema = z.object({
  caption: z.string(),
  platform: z.string(),
});

export const BulkContentSchema = z.object({
  articles: z.array(BulkArticleSchema),
  posts: z.array(BulkPostSchema),
});
export type BulkContentResult = z.infer<typeof BulkContentSchema>;

// ============== Chat/History Types ==============

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// ============== Image Types ==============

export interface ImageGenerationResult {
  imageUrl: string;
  base64Image: string;
  mimeType: string;
}

export interface ImageEditResult {
  imageUrl: string;
  base64Image: string;
}

// ============== Agent Types ==============

export interface AgentQuery {
  query: string;
  channelId?: string;
  history?: ChatMessage[];
  notebookId?: string;
  maxSteps?: number;
}

export interface AgentResponse {
  response: string;
  sources?: { name: string; content: string }[];
  toolCalls?: { name: string; result: unknown }[];
  steps?: number;
}

export type AgentTaskType = 'create_article_draft' | 'create_post_draft' | 'create_media_draft';

export interface AgentTask {
  type: AgentTaskType;
  params: Record<string, unknown>;
}

// ============== Streaming Types ==============

export interface StreamChunk {
  type: 'delta' | 'done';
  content?: string;
  chatResponse?: string;
}
