import { generateText, Output } from 'ai';
import { createModelConfig, selectModel } from '../models';
import {
  TitleSchema,
  SubjectSchema,
  MetadataSchema,
  ExcerptSchema,
  PreviewTextSchema,
  PostDetailsSchema,
  ArticleMetadataSchema,
  BulkContentSchema,
  type TitleResult,
  type SubjectResult,
  type MetadataResult,
  type ExcerptResult,
  type PreviewTextResult,
  type PostDetailsResult,
  type ArticleMetadata,
  type BulkContentResult,
} from '../types';
import { withErrorHandling } from '../errors';
import { repairAndParse } from '../generate';
import logger from '../../../utils/logger';

export async function generateTitle(content: string): Promise<TitleResult> {
  logger.info('Generating title');

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('title'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        system: 'You are a headline writer. Generate catchy, SEO-friendly titles. Always respond with valid JSON.',
        prompt: `Generate a title for this article content:\n\n${content.substring(0, 2000)}`,
        output: Output.object({ schema: TitleSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(text, TitleSchema, 'an object with a "title" string field');
      return repaired ?? { title: '' };
    },
    'generateTitle'
  );
}

export async function generateSubject(content: string): Promise<SubjectResult> {
  logger.info('Generating newsletter subject');

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('subject'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        system: 'You are an email marketing expert. Generate compelling subject lines. Always respond with valid JSON.',
        prompt: `Generate a subject line for this newsletter:\n\n${content.substring(0, 2000)}`,
        output: Output.object({ schema: SubjectSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(text, SubjectSchema, 'an object with a "subject" string field');
      return repaired ?? { subject: '' };
    },
    'generateSubject'
  );
}

export async function generateMetadata(content: string, title: string): Promise<MetadataResult> {
  logger.info('Generating metadata');

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('metadata'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        prompt: `Generate SEO metadata and a short excerpt for this article.\nTitle: ${title}\nContent: ${content.substring(0, 3000)}`,
        output: Output.object({ schema: MetadataSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(
        text,
        MetadataSchema,
        'an object with "seo" (containing title, description, keywords, slug) and "excerpt" fields'
      );
      return repaired ?? { seo: { title: '', description: '', keywords: '', slug: '' }, excerpt: '' };
    },
    'generateMetadata'
  );
}

export async function generateExcerpt(content: string): Promise<ExcerptResult> {
  logger.info('Generating excerpt');

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('excerpt'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        prompt: `Summarize this text into a short excerpt:\n\n${content.substring(0, 2000)}`,
        output: Output.object({ schema: ExcerptSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(text, ExcerptSchema, 'an object with an "excerpt" string field');
      return repaired ?? { excerpt: '' };
    },
    'generateExcerpt'
  );
}

export async function generatePreviewText(content: string): Promise<PreviewTextResult> {
  logger.info('Generating preview text');

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('previewText'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        prompt: `Generate a short preview text (preheader) for this email:\n\n${content.substring(0, 2000)}`,
        output: Output.object({ schema: PreviewTextSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(text, PreviewTextSchema, 'an object with a "previewText" string field');
      return repaired ?? { previewText: '' };
    },
    'generatePreviewText'
  );
}

export async function generatePostDetails(prompt: string, currentCaption: string): Promise<PostDetailsResult> {
  logger.info('Generating post details');

  return withErrorHandling(
    async () => {
      const input = `
Task: Create or refine an Instagram post based on the user's prompt.
User Prompt: "${prompt}"
Current Caption Context: "${currentCaption}"

Output Requirements:
1. content: The caption text (include emojis).
2. altText: Accessibility description for the image.
3. tags: Array of hashtags (without # symbol).
`;

      const modelConfig = createModelConfig(selectModel('postDetails'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        prompt: input,
        output: Output.object({ schema: PostDetailsSchema }),
      });

      // Try repair if output is null
      const result = output ?? (await repairAndParse(
        text,
        PostDetailsSchema,
        'an object with "content" string, "altText" string, and "tags" string array fields'
      ));

      // Format tags with # prefix
      const formattedTags = (result?.tags || []).map((t: string) => (String(t).startsWith('#') ? String(t) : `#${t}`));

      return {
        content: result?.content || '',
        altText: result?.altText || '',
        tags: formattedTags,
      };
    },
    'generatePostDetails'
  );
}

export async function generateArticleMetadata(content: string): Promise<ArticleMetadata> {
  logger.info('Generating article metadata (legacy)');

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('metadata'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        system: 'You are an SEO expert. Generate comprehensive metadata for the given article content.',
        prompt: `Generate metadata for this article content: ${content}`,
        output: Output.object({ schema: ArticleMetadataSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(
        text,
        ArticleMetadataSchema,
        'an object with "title" string, "description" string, "keywords" string array, and "slug" string fields'
      );
      return repaired ?? { title: '', description: '', keywords: [], slug: '' };
    },
    'generateArticleMetadata'
  );
}

export async function generateBulkContent(
  articleCount: number,
  postCount: number,
  knowledgeSummary: string
): Promise<BulkContentResult> {
  logger.info(`Generating bulk content: ${articleCount} articles, ${postCount} posts`);

  return withErrorHandling(
    async () => {
      const modelConfig = createModelConfig(selectModel('bulkContent'));

      const { output, text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        system: 'You are a content strategist generating multiple pieces of content based on the provided knowledge summary.',
        prompt: `Generate ${articleCount} articles and ${postCount} social media posts based on: ${knowledgeSummary}`,
        output: Output.object({ schema: BulkContentSchema }),
      });

      if (output) return output;

      const repaired = await repairAndParse(
        text,
        BulkContentSchema,
        'an object with "articles" array (title, content) and "posts" array (platform, caption)'
      );
      return repaired ?? { articles: [], posts: [] };
    },
    'generateBulkContent'
  );
}

export async function inferMetadata(content: string, type: 'article' | 'post' | 'newsletter'): Promise<unknown> {
  if (type === 'article') {
    const titleResult = await generateTitle(content);
    const metaResult = await generateMetadata(content, titleResult.title);
    return { ...titleResult, ...metaResult };
  } else if (type === 'newsletter') {
    const subjectResult = await generateSubject(content);
    const previewResult = await generatePreviewText(content);
    return { ...subjectResult, ...previewResult };
  } else {
    // Post
    const details = await generatePostDetails('Generate details for this caption', content);
    return details;
  }
}
