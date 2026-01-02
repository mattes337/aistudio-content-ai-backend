/**
 * Built-in Content Workflow
 *
 * Handles content creation and refinement using local AI models.
 * Supports both streaming and non-streaming operations.
 */

import { generateText, Output, streamText } from 'ai';
import { createModelConfig, selectModel } from '../../models';
import {
  RefineContentResultSchema,
  type RefineContentResult,
  type StreamChunk,
} from '../../types';
import type { ContentWorkflow, ContentInput } from '../types';
import { withErrorHandling } from '../../errors';
import { repairAndParse } from '../../generate';
import logger from '../../../../utils/logger';

/**
 * Built-in content workflow using local AI models
 */
export class BuiltinContentWorkflow implements ContentWorkflow {
  readonly type = 'content' as const;
  readonly id = 'builtin';
  readonly name = 'Built-in Content';
  readonly description = 'Handles content creation and refinement using local AI models';

  isAvailable(): boolean {
    return true; // Always available as the default
  }

  async execute(input: ContentInput): Promise<RefineContentResult> {
    const { contentType, instruction, currentContent = '', history = [] } = input;
    logger.info(`[BuiltinContent] Executing for ${contentType}`);

    return withErrorHandling(
      async () => {
        const historyContext = history.map((msg) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`).join('\n');

        const prompt = `
Current Content:
"""
${currentContent || '(No content yet)'}
"""

Previous Conversation History:
"""
${historyContext || '(No history)'}
"""

User Instruction: "${instruction}"

Task:
1. Generate or Update the content based on the instruction and context.
2. Provide a very brief, encouraging response to the user about what you changed (max 1 sentence).
`;

        const modelConfig = createModelConfig(selectModel('refine'));

        const { output, text } = await generateText({
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxOutputTokens: modelConfig.maxTokens,
          providerOptions: modelConfig.providerOptions,
          system: `You are an expert content creator helping a user write a ${contentType}. Always generate high-quality, engaging content.`,
          prompt,
          output: Output.object({ schema: RefineContentResultSchema }),
        });

        if (output) {
          return {
            content: output.content || currentContent,
            chatResponse: output.chatResponse || 'Here is the updated draft.',
          };
        }

        // Try repair if output is null
        const repaired = await repairAndParse(
          text,
          RefineContentResultSchema,
          'an object with "content" string and "chatResponse" string fields'
        );

        return {
          content: repaired?.content || currentContent,
          chatResponse: repaired?.chatResponse || 'Here is the updated draft.',
        };
      },
      'BuiltinContentWorkflow.execute'
    );
  }

  async *executeStream(input: ContentInput): AsyncGenerator<StreamChunk> {
    const { contentType, instruction, currentContent = '', history = [] } = input;
    logger.info(`[BuiltinContent] Streaming for ${contentType}`);

    const historyContext = history.map((msg) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`).join('\n');

    const prompt = `
Current Content:
"""
${currentContent || '(No content yet)'}
"""

Previous Conversation History:
"""
${historyContext || '(No history)'}
"""

User Instruction: "${instruction}"

Task:
Generate or update the content based on the instruction and context.
Output ONLY the content, nothing else.
`;

    const config = createModelConfig(selectModel('refine'));

    try {
      const { textStream } = streamText({
        ...config,
        system: `You are an expert content creator helping a user write a ${contentType}. Always generate high-quality, engaging content.`,
        prompt,
      });

      let fullContent = '';

      for await (const chunk of textStream) {
        fullContent += chunk;
        yield { type: 'delta', content: chunk };
      }

      yield {
        type: 'done',
        content: fullContent,
        chatResponse: 'Here is the updated draft.',
      };
    } catch (error) {
      logger.error('Streaming content failed:', error);
      throw error;
    }
  }
}
