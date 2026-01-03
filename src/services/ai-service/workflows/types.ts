/**
 * Workflow Types and Interfaces
 *
 * This module defines the base types for the AI workflow architecture.
 * Workflows are categorized by their purpose and can have multiple implementations.
 */

import type {
  AgentQuery,
  AgentResponse,
  ResearchStreamOptions,
  ResearchStreamChunk,
  RefineContentResult,
  TitleResult,
  SubjectResult,
  MetadataResult,
  ExcerptResult,
  PreviewTextResult,
  PostDetailsResult,
  ImageGenerationResult,
  ImageEditResult,
  BulkContentResult,
  ContentType,
  ChatMessage,
  StreamChunk,
} from '../types';

/**
 * Workflow type categories
 */
export type WorkflowType =
  | 'research'    // Research and knowledge retrieval
  | 'metadata'    // Metadata generation (titles, SEO, etc.)
  | 'content'     // Content creation and refinement
  | 'image'       // Image generation and editing
  | 'bulk'        // Bulk content generation
  | 'task';       // Task execution (drafts, etc.)

/**
 * Base interface for all workflows
 */
export interface Workflow<TType extends WorkflowType = WorkflowType> {
  /** Workflow type category */
  readonly type: TType;
  /** Unique identifier for this workflow implementation */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description of what this workflow does */
  readonly description: string;
  /** Whether this workflow is available (may depend on configuration) */
  isAvailable(): boolean;
}

// ============== Research Workflow Types ==============

export interface ResearchWorkflowInput extends AgentQuery {
  verbose?: boolean;
  searchWeb?: boolean;
}

export interface ResearchWorkflow extends Workflow<'research'> {
  /** Execute a research query (non-streaming) */
  execute(input: AgentQuery): Promise<AgentResponse>;
  /** Execute a research query with streaming */
  executeStream(input: ResearchStreamOptions): AsyncGenerator<ResearchStreamChunk>;
}

// ============== Metadata Workflow Types ==============

/** Metadata operation types that can be requested */
export type MetadataOperation =
  | 'title'           // Generate article title
  | 'subject'         // Generate email subject
  | 'seoMetadata'     // Generate SEO metadata (title, description, keywords, slug)
  | 'excerpt'         // Generate content excerpt/summary
  | 'previewText'     // Generate email preview text
  | 'postDetails';    // Generate social post details (caption, altText, tags)

/** Input for metadata generation */
export interface MetadataInput {
  /** The content to generate metadata from */
  content: string;
  /** Content type context */
  contentType: ContentType;
  /** Title (required for seoMetadata operation) */
  title?: string;
  /** Prompt for post details */
  prompt?: string;
  /** Current caption context for post details */
  currentCaption?: string;
}

/** Result types for each metadata operation */
export interface MetadataResults {
  title: TitleResult;
  subject: SubjectResult;
  seoMetadata: MetadataResult;
  excerpt: ExcerptResult;
  previewText: PreviewTextResult;
  postDetails: PostDetailsResult;
}

export interface MetadataWorkflow extends Workflow<'metadata'> {
  /**
   * Generate metadata based on requested operations.
   * Caller specifies which metadata fields they need.
   *
   * @param operations - Array of metadata operations to perform
   * @param input - Input data for metadata generation
   * @returns Object containing results for each requested operation
   */
  generate<T extends MetadataOperation>(
    operations: T[],
    input: MetadataInput
  ): Promise<Pick<MetadataResults, T>>;
}

// ============== Content Workflow Types ==============

/** Input for content generation/refinement */
export interface ContentInput {
  /** Type of content being created/refined */
  contentType: ContentType;
  /** User instruction for what to create or how to refine */
  instruction: string;
  /** Current content (for refinement) */
  currentContent?: string;
  /** Conversation history for context */
  history?: ChatMessage[];
}

export interface ContentWorkflow extends Workflow<'content'> {
  /**
   * Generate or refine content based on instruction.
   *
   * @param input - Content generation input
   * @returns Generated/refined content with chat response
   */
  execute(input: ContentInput): Promise<RefineContentResult>;

  /**
   * Generate or refine content with streaming.
   *
   * @param input - Content generation input
   * @yields Stream chunks of the content
   */
  executeStream(input: ContentInput): AsyncGenerator<StreamChunk>;
}

// ============== Image Workflow Types ==============

/** Supported image types */
export type ImageType = 'photo' | 'illustration' | 'icon' | 'diagram' | 'art' | 'other';

/** Image quality levels */
export type ImageQuality = 'auto' | 'low' | 'medium' | 'high';

/** Image dimensions/bounds */
export interface ImageBounds {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Aspect ratio (e.g., "16:9", "1:1", "4:3") */
  aspectRatio?: string;
}

/** Default system prompt for image generation */
export const DEFAULT_IMAGE_SYSTEM_PROMPT = 'Do not write text into the image';

/** Input for image generation */
export interface ImageGenerateInput {
  /** Text description of the image to generate */
  prompt: string;
  /** Type of image to generate */
  imageType?: ImageType;
  /** Image dimensions/bounds */
  bounds?: ImageBounds;
  /** Model to use for generation (overrides default) */
  model?: string;
  /** Quality level for generation */
  quality?: ImageQuality;
  /** System prompt / instructions for image generation */
  systemPrompt?: string;
}

/** Input for image editing */
export interface ImageEditInput {
  /** Base64 encoded source image */
  base64ImageData: string;
  /** MIME type of the source image */
  mimeType: string;
  /** Edit instructions */
  prompt: string;
  /** Type of output image desired */
  imageType?: ImageType;
  /** Output image dimensions/bounds */
  bounds?: ImageBounds;
  /** Model to use for editing (overrides default) */
  model?: string;
  /** Quality level for editing */
  quality?: ImageQuality;
}

export interface ImageWorkflow extends Workflow<'image'> {
  /**
   * Generate a new image from text description.
   *
   * @param input - Image generation parameters
   * @returns Generated image data
   */
  generate(input: ImageGenerateInput): Promise<ImageGenerationResult>;

  /**
   * Edit an existing image with text instructions.
   *
   * @param input - Image edit parameters
   * @returns Edited image data
   */
  edit(input: ImageEditInput): Promise<ImageEditResult>;
}

// ============== Bulk Workflow Types ==============

export interface BulkWorkflowInput {
  articleCount: number;
  postCount: number;
  knowledgeSummary: string;
}

export interface BulkWorkflow extends Workflow<'bulk'> {
  /** Generate multiple pieces of content at once */
  generateBulkContent(
    articleCount: number,
    postCount: number,
    knowledgeSummary: string
  ): Promise<BulkContentResult>;
}

// ============== Task Workflow Types ==============

export type TaskType = 'create_article_draft' | 'create_post_draft' | 'create_media_draft';

export interface TaskWorkflowInput {
  taskType: TaskType;
  params: Record<string, unknown>;
}

export interface TaskWorkflow extends Workflow<'task'> {
  /** Execute a structured task */
  executeTask(taskType: TaskType, params: Record<string, unknown>): Promise<Record<string, unknown>>;
}

// ============== Workflow Union Types ==============

export type AnyWorkflow =
  | ResearchWorkflow
  | MetadataWorkflow
  | ContentWorkflow
  | ImageWorkflow
  | BulkWorkflow
  | TaskWorkflow;

export type WorkflowByType<T extends WorkflowType> =
  T extends 'research' ? ResearchWorkflow :
  T extends 'metadata' ? MetadataWorkflow :
  T extends 'content' ? ContentWorkflow :
  T extends 'image' ? ImageWorkflow :
  T extends 'bulk' ? BulkWorkflow :
  T extends 'task' ? TaskWorkflow :
  never;
