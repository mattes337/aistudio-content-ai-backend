import { generateText, Output } from 'ai';
import { createModelConfig, selectModel } from '../models';
import { RefineContentResultSchema, type RefineContentResult, type ChatMessage, type ContentType } from '../types';
import { withErrorHandling } from '../errors';
import { repairAndParse } from '../generate';
import logger from '../../../utils/logger';

export async function refineContent(
  currentContent: string,
  instruction: string,
  type: ContentType,
  history: ChatMessage[] = []
): Promise<RefineContentResult> {
  logger.info(`Refining ${type} content`);

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
        system: `You are an expert content creator helping a user write a ${type}. Always generate high-quality, engaging content.`,
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
    'refineContent'
  );
}

export async function generateArticleContent(prompt: string, currentContent?: string): Promise<string> {
  logger.info('Generating article content');

  return withErrorHandling(
    async () => {
      const systemPrompt = `You are a professional content writer. Generate high-quality, engaging article content based on the user's prompt.
${currentContent ? `The current content is: "${currentContent}". Please revise or expand upon it.` : 'Create new content from scratch.'}
The content should be well-structured, informative, and engaging. Use proper formatting with paragraphs and headings where appropriate.`;

      const modelConfig = createModelConfig(selectModel('articleContent'));

      const { text } = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        system: systemPrompt,
        prompt,
      });

      return text || 'No content generated';
    },
    'generateArticleContent'
  );
}
