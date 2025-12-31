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
  /** Optional model configuration for Open Notebook API */
  modelConfig?: OpenNotebookModelConfig;
}

/**
 * Location within a source document.
 * Different source types use different location formats:
 * - text/pdf: line, page, paragraph, chapter, section
 * - video/audio: timecode (format: "HH:MM:SS" or "MM:SS")
 * - website: anchor (URL fragment)
 */
export interface SourceLocation {
  /** Location type identifier */
  type: 'line' | 'page' | 'paragraph' | 'chapter' | 'section' | 'timecode' | 'anchor' | 'index';
  /** Location value (line number, page number, timecode string, etc.) */
  value: string;
  /** Human-readable label for the location (e.g., "Page 15", "Chapter 3: Introduction") */
  label?: string;
}

/** Reference to a knowledge source used in a response */
export interface SourceReference {
  id: string;
  name: string;
  excerpt: string;
  score: number;
  usedInResponse?: boolean;
  /** Location within the source (optional) */
  location?: SourceLocation;
  /** Source type (e.g., 'text', 'pdf', 'video', 'audio', 'website') */
  sourceType?: string;
}

/**
 * Inline Reference Format Specification
 *
 * References are embedded in AI response text using this format:
 * [[ref:id={SOURCE_ID}|name={SOURCE_NAME}|loc={LOCATION_TYPE}:{LOCATION_VALUE}]]
 *
 * Components:
 * - id: The unique identifier of the knowledge base source
 * - name: Human-readable name of the source
 * - loc: Optional location within the source (type:value format)
 *
 * Location types:
 * - line:{number} - Line number in text documents
 * - page:{number} - Page number in PDFs
 * - chapter:{name} - Chapter identifier
 * - section:{name} - Section identifier
 * - timecode:{HH:MM:SS} - Timestamp in audio/video
 * - anchor:{fragment} - URL fragment for web sources
 * - index:{number} - Generic index position
 *
 * Examples:
 * - [[ref:id=source:abc123|name=Marketing Guide|loc=chapter:3]]
 * - [[ref:id=source:xyz|name=Podcast Ep 42|loc=timecode:15:30]]
 * - [[ref:id=source:def|name=API Docs|loc=section:Authentication]]
 * - [[ref:id=source:ghi|name=User Manual]] (no location)
 *
 * Regex for parsing: /\[\[ref:id=([^|]+)\|name=([^|\]]+)(?:\|loc=([^:]+):([^\]]+))?\]\]/g
 */
export const REFERENCE_FORMAT = {
  /** Regex pattern to match inline references */
  pattern: /\[\[ref:id=([^|]+)\|name=([^|\]]+)(?:\|loc=([^:]+):([^\]]+))?\]\]/g,

  /** Build an inline reference string */
  build: (id: string, name: string, location?: SourceLocation): string => {
    const escapedName = name.replace(/[|\]]/g, ' ');
    let ref = `[[ref:id=${id}|name=${escapedName}`;
    if (location) {
      const escapedValue = String(location.value).replace(/[\]]/g, '');
      ref += `|loc=${location.type}:${escapedValue}`;
    }
    ref += ']]';
    return ref;
  },

  /** Parse an inline reference string */
  parse: (ref: string): { id: string; name: string; location?: SourceLocation } | null => {
    const match = /\[\[ref:id=([^|]+)\|name=([^|\]]+)(?:\|loc=([^:]+):([^\]]+))?\]\]/.exec(ref);
    if (!match || !match[1] || !match[2]) return null;

    const result: { id: string; name: string; location?: SourceLocation } = {
      id: match[1],
      name: match[2],
    };

    if (match[3] && match[4]) {
      result.location = {
        type: match[3] as SourceLocation['type'],
        value: match[4],
      };
    }

    return result;
  },
};

export interface AgentResponse {
  response: string;
  sources?: SourceReference[];
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

// ============== Research Streaming Types ==============

export interface ResearchStreamChunk {
  type: 'status' | 'tool_start' | 'tool_result' | 'delta' | 'sources' | 'done' | 'error';
  /** Status message for current operation */
  status?: string;
  /** Tool name being executed */
  tool?: string;
  /** Tool input parameters (verbose mode) */
  toolInput?: Record<string, unknown>;
  /** Tool execution result (verbose mode) */
  toolResult?: unknown;
  /** Incremental text content */
  content?: string;
  /** Source references found */
  sources?: SourceReference[];
  /** Final complete response */
  response?: string;
  /** Total steps taken */
  steps?: number;
  /** Error message */
  error?: string;
}

/** Model configuration for Open Notebook API calls */
export interface OpenNotebookModelConfig {
  /** Model for retrieval strategy planning */
  strategyModel?: string;
  /** Model for generating intermediate answers */
  answerModel?: string;
  /** Model for synthesizing final answer */
  finalAnswerModel?: string;
}

export interface ResearchStreamOptions {
  query: string;
  channelId?: string;
  history?: ChatMessage[];
  notebookId?: string;
  maxSteps?: number;
  /** Stream verbose output including tool calls and intermediate results */
  verbose?: boolean;
  /** Enable web search to find information from the internet */
  searchWeb?: boolean;
  /** Optional model configuration for Open Notebook API */
  modelConfig?: OpenNotebookModelConfig;
}
