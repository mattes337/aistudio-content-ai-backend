/**
 * Built-in Metadata Workflow
 *
 * Generates various types of metadata using local AI models.
 * Caller specifies which metadata operations they need.
 */

import { generateText, Output } from 'ai';
import { createModelConfig, selectModel } from '../../models';
import {
  TitleSchema,
  SubjectSchema,
  MetadataSchema,
  ExcerptSchema,
  PreviewTextSchema,
  PostDetailsSchema,
  type TitleResult,
  type SubjectResult,
  type MetadataResult,
  type ExcerptResult,
  type PreviewTextResult,
  type PostDetailsResult,
} from '../../types';
import type { MetadataWorkflow, MetadataOperation, MetadataInput, MetadataResults } from '../types';
import { withErrorHandling } from '../../errors';
import { repairAndParse } from '../../generate';
import logger from '../../../../utils/logger';

/**
 * Built-in metadata workflow using local AI models
 */
export class BuiltinMetadataWorkflow implements MetadataWorkflow {
  readonly type = 'metadata' as const;
  readonly id = 'builtin';
  readonly name = 'Built-in Metadata';
  readonly description = 'Generates metadata using local AI models (Gemini Flash)';

  isAvailable(): boolean {
    return true; // Always available as the default
  }

  /**
   * Generate metadata based on requested operations.
   * Runs all requested operations in parallel for efficiency.
   */
  async generate<T extends MetadataOperation>(
    operations: T[],
    input: MetadataInput
  ): Promise<Pick<MetadataResults, T>> {
    logger.info(`[BuiltinMetadata] Generating: ${operations.join(', ')} for ${input.contentType}`);

    const results: Partial<MetadataResults> = {};

    // Run all operations in parallel
    const promises = operations.map(async (op) => {
      switch (op) {
        case 'title':
          results.title = await this.generateTitle(input.content);
          break;
        case 'subject':
          results.subject = await this.generateSubject(input.content);
          break;
        case 'seoMetadata':
          if (!input.title) {
            // Generate title first if not provided
            const titleResult = await this.generateTitle(input.content);
            results.seoMetadata = await this.generateSeoMetadata(input.content, titleResult.title);
          } else {
            results.seoMetadata = await this.generateSeoMetadata(input.content, input.title);
          }
          break;
        case 'excerpt':
          results.excerpt = await this.generateExcerpt(input.content);
          break;
        case 'previewText':
          results.previewText = await this.generatePreviewText(input.content);
          break;
        case 'postDetails':
          results.postDetails = await this.generatePostDetails(
            input.prompt || 'Generate details for this content',
            input.currentCaption || input.content
          );
          break;
      }
    });

    await Promise.all(promises);

    return results as Pick<MetadataResults, T>;
  }

  private async generateTitle(content: string): Promise<TitleResult> {
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
      'BuiltinMetadataWorkflow.generateTitle'
    );
  }

  private async generateSubject(content: string): Promise<SubjectResult> {
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
      'BuiltinMetadataWorkflow.generateSubject'
    );
  }

  private async generateSeoMetadata(content: string, title: string): Promise<MetadataResult> {
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
      'BuiltinMetadataWorkflow.generateSeoMetadata'
    );
  }

  private async generateExcerpt(content: string): Promise<ExcerptResult> {
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
      'BuiltinMetadataWorkflow.generateExcerpt'
    );
  }

  private async generatePreviewText(content: string): Promise<PreviewTextResult> {
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
      'BuiltinMetadataWorkflow.generatePreviewText'
    );
  }

  private async generatePostDetails(prompt: string, currentCaption: string): Promise<PostDetailsResult> {
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
      'BuiltinMetadataWorkflow.generatePostDetails'
    );
  }
}
