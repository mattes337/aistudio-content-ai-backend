/**
 * Built-in Bulk Workflow
 *
 * Handles bulk content generation using local AI models.
 */

import { generateText, Output } from 'ai';
import { createModelConfig, selectModel } from '../../models';
import { BulkContentSchema, type BulkContentResult } from '../../types';
import type { BulkWorkflow } from '../types';
import { withErrorHandling } from '../../errors';
import { repairAndParse } from '../../generate';
import logger from '../../../../utils/logger';

/**
 * Built-in bulk workflow using local AI models
 */
export class BuiltinBulkWorkflow implements BulkWorkflow {
  readonly type = 'bulk' as const;
  readonly id = 'builtin';
  readonly name = 'Built-in Bulk';
  readonly description = 'Handles bulk content generation using local AI models';

  isAvailable(): boolean {
    return true; // Always available as the default
  }

  async generateBulkContent(
    articleCount: number,
    postCount: number,
    knowledgeSummary: string
  ): Promise<BulkContentResult> {
    logger.info(`[BuiltinBulk] Generating bulk content: ${articleCount} articles, ${postCount} posts`);

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
      'BuiltinBulkWorkflow.generateBulkContent'
    );
  }
}
