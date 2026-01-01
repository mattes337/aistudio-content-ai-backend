import { tool } from 'ai';
import { z } from 'zod/v3';
import logger from '../../../utils/logger';

/**
 * Intent-based content creation tools
 *
 * These tools are called by the research agent when it detects user intent
 * to create content (articles, posts, media). The agent generates the content
 * and calls the appropriate tool, which returns a structured result that
 * the frontend can use to navigate to the appropriate editor.
 */

// ============== Schema Definitions ==============

const createArticleDraftInputSchema = z.object({
  title: z.string().describe('The title of the article'),
  content: z.string().describe('The HTML content of the article body'),
});

const createPostDraftInputSchema = z.object({
  caption: z.string().describe('The post caption with emojis and hashtags'),
  platform: z.string().optional().describe('The target platform (e.g., Instagram, LinkedIn, Twitter)'),
});

const createMediaDraftInputSchema = z.object({
  prompt: z.string().describe('A detailed prompt for the image generator'),
});

// ============== Tool Result Types ==============

export interface ArticleDraftResult {
  success: true;
  type: 'article_draft';
  title: string;
  content: string;
}

export interface PostDraftResult {
  success: true;
  type: 'post_draft';
  caption: string;
  platform?: string;
}

export interface MediaDraftResult {
  success: true;
  type: 'media_draft';
  prompt: string;
}

export type IntentToolResult = ArticleDraftResult | PostDraftResult | MediaDraftResult;

// ============== Tool Implementations ==============

/**
 * Create an article draft based on research content
 */
export const createArticleDraftTool = tool({
  description:
    'Create a new blog article draft based on the research content. Use this when the user explicitly asks to create an article, blog post, or written content.',
  inputSchema: createArticleDraftInputSchema,
  execute: async ({ title, content }) => {
    logger.info(`Creating article draft: "${title.substring(0, 50)}..."`);

    return {
      success: true,
      type: 'article_draft',
      title,
      content,
    } as ArticleDraftResult;
  },
});

/**
 * Create a social media post draft
 */
export const createPostDraftTool = tool({
  description:
    'Create a new social media post draft. Use this when the user explicitly asks to create a social media post, Instagram post, LinkedIn post, or Twitter/X post.',
  inputSchema: createPostDraftInputSchema,
  execute: async ({ caption, platform }) => {
    logger.info(`Creating post draft for platform: ${platform || 'unspecified'}`);

    return {
      success: true,
      type: 'post_draft',
      caption,
      platform,
    } as PostDraftResult;
  },
});

/**
 * Create a media/image draft with a generation prompt
 */
export const createMediaDraftTool = tool({
  description:
    'Generate a new media/image asset based on a prompt. Use this when the user explicitly asks to create an image, generate media, or create visual content.',
  inputSchema: createMediaDraftInputSchema,
  execute: async ({ prompt }) => {
    logger.info(`Creating media draft with prompt: "${prompt.substring(0, 50)}..."`);

    return {
      success: true,
      type: 'media_draft',
      prompt,
    } as MediaDraftResult;
  },
});

// ============== Tool Registry ==============

export const intentTools = {
  create_article_draft: createArticleDraftTool,
  create_post_draft: createPostDraftTool,
  create_media_draft: createMediaDraftTool,
};
