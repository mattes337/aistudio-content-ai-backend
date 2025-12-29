import { streamText } from 'ai';
import { createModelConfig, selectModel } from './models';
import type { ChatMessage, ContentType, StreamChunk } from './types';
import logger from '../../utils/logger';

export async function* refineContentStream(
  currentContent: string,
  instruction: string,
  type: ContentType,
  history: ChatMessage[] = []
): AsyncGenerator<StreamChunk> {
  logger.info(`Streaming refine ${type} content`);

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
      system: `You are an expert content creator helping a user write a ${type}. Always generate high-quality, engaging content.`,
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
    logger.error('Streaming refine content failed:', error);
    throw error;
  }
}

export async function* generateArticleContentStream(
  prompt: string,
  currentContent?: string
): AsyncGenerator<StreamChunk> {
  logger.info('Streaming article content generation');

  const systemPrompt = `You are a professional content writer. Generate high-quality, engaging article content based on the user's prompt.
${currentContent ? `The current content is: "${currentContent}". Please revise or expand upon it.` : 'Create new content from scratch.'}
The content should be well-structured, informative, and engaging. Use proper formatting with paragraphs and headings where appropriate.`;

  const config = createModelConfig(selectModel('articleContent'));

  try {
    const { textStream } = streamText({
      ...config,
      system: systemPrompt,
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
    };
  } catch (error) {
    logger.error('Streaming article content failed:', error);
    throw error;
  }
}
