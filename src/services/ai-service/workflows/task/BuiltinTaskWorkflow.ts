/**
 * Built-in Task Workflow
 *
 * Handles structured task execution using local AI models.
 * Supports creating article drafts, post drafts, and media prompts.
 */

import { generateText } from 'ai';
import { createModelConfig, selectModel } from '../../models';
import type { TaskWorkflow, TaskType } from '../types';
import { withErrorHandling } from '../../errors';
import logger from '../../../../utils/logger';

/**
 * Built-in task workflow using local AI models
 */
export class BuiltinTaskWorkflow implements TaskWorkflow {
  readonly type = 'task' as const;
  readonly id = 'builtin';
  readonly name = 'Built-in Task';
  readonly description = 'Handles structured task execution for creating drafts and content';

  isAvailable(): boolean {
    return true; // Always available as the default
  }

  async executeTask(taskType: TaskType, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    logger.info(`[BuiltinTask] Executing task: ${taskType}`);

    return withErrorHandling(
      async () => {
        let prompt = '';
        switch (taskType) {
          case 'create_article_draft':
            prompt = `Create a blog article with the following requirements:
Title: ${params.title || 'Generate an appropriate title'}
Topic: ${params.topic || 'Based on context'}
Content guidelines: ${params.guidelines || 'Professional, informative, engaging'}

Generate the full HTML content for the article body.`;
            break;

          case 'create_post_draft':
            prompt = `Create a social media post:
Platform: ${params.platform || 'Instagram'}
Topic: ${params.topic || 'Based on context'}
Tone: ${params.tone || 'Engaging and authentic'}

Generate the caption with emojis and relevant hashtags.`;
            break;

          case 'create_media_draft':
            prompt = `Generate a detailed image prompt:
Subject: ${params.subject || 'Based on context'}
Style: ${params.style || 'Modern, professional'}

Create a detailed, specific prompt suitable for an image generation model.`;
            break;

          default:
            throw new Error(`Unknown task type: ${taskType}`);
        }

        const modelConfig = createModelConfig(selectModel('agent'));

        const result = await generateText({
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxOutputTokens: modelConfig.maxTokens,
          providerOptions: modelConfig.providerOptions,
          prompt,
        });

        return { type: taskType, result: result.text };
      },
      'BuiltinTaskWorkflow.executeTask'
    );
  }
}
