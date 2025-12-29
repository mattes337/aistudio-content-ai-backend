import { generateText, stepCountIs } from 'ai';
import { createModelConfig, selectModel } from './models';
import { researchTools } from './tools';
import { OpenNotebookService } from '../OpenNotebookService';
import type { AgentQuery, AgentResponse, AgentTask, ChatMessage } from './types';
import { withErrorHandling } from './errors';
import logger from '../../utils/logger';

export async function researchQuery(request: AgentQuery): Promise<AgentResponse> {
  logger.info(`Research agent query: "${request.query.substring(0, 50)}..."`);

  return withErrorHandling(
    async () => {
      // Step 1: Pre-fetch context from knowledge base
      let contextText = '';
      let sources: { name: string; content: string }[] = [];

      try {
        const searchResults = await OpenNotebookService.search({
          query: request.query,
          type: 'vector',
          limit: 5,
          minimum_score: 0.3,
        });

        if (searchResults.results.length > 0) {
          sources = searchResults.results.map((r) => ({
            name: r.source_name || 'Unknown Source',
            content: r.content,
          }));
          contextText = sources.map((s) => `Source (${s.name}): ${s.content}`).join('\n\n');
        }
      } catch (error) {
        logger.warn('Could not retrieve context from Open Notebook:', error);
      }

      // Step 2: Build conversation context
      const historyContext =
        request.history?.map((msg: ChatMessage) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n') ||
        '';

      const systemPrompt = `You are a Research Agent for a Content Manager app.

Context from Knowledge Base:
"""
${contextText || '(No context available)'}
"""

Conversation History:
"""
${historyContext || '(No history)'}
"""

Instructions:
1. Answer the user's question thoroughly.
2. If the Context from Knowledge Base contains relevant information, use it and cite the source.
3. You have access to tools to search and ask the knowledge base for more information if needed.
4. Never say "I don't have information" - always provide a helpful answer.
5. Use Markdown formatting for readability.
6. If the user asks to create content (article, post, media), describe what you would create.`;

      // Step 3: Run agent with tools
      const modelConfig = createModelConfig(selectModel('agent'));
      const toolCalls: { name: string; result: unknown }[] = [];

      const result = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        system: systemPrompt,
        prompt: request.query,
        tools: researchTools,
        stopWhen: stepCountIs(request.maxSteps || 5),
        onStepFinish: ({ toolCalls: stepToolCalls }) => {
          if (stepToolCalls) {
            for (const tc of stepToolCalls) {
              toolCalls.push({
                name: tc.toolName,
                result: (tc as any).result,
              });
            }
          }
        },
      });

      return {
        response: result.text,
        sources: sources.length > 0 ? sources : undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        steps: result.steps?.length,
      };
    },
    'researchQuery'
  );
}

export async function executeTask(task: AgentTask): Promise<Record<string, unknown>> {
  logger.info(`Executing agent task: ${task.type}`);

  return withErrorHandling(
    async () => {
      let prompt = '';
      switch (task.type) {
        case 'create_article_draft':
          prompt = `Create a blog article with the following requirements:
Title: ${task.params.title || 'Generate an appropriate title'}
Topic: ${task.params.topic || 'Based on context'}
Content guidelines: ${task.params.guidelines || 'Professional, informative, engaging'}

Generate the full HTML content for the article body.`;
          break;

        case 'create_post_draft':
          prompt = `Create a social media post:
Platform: ${task.params.platform || 'Instagram'}
Topic: ${task.params.topic || 'Based on context'}
Tone: ${task.params.tone || 'Engaging and authentic'}

Generate the caption with emojis and relevant hashtags.`;
          break;

        case 'create_media_draft':
          prompt = `Generate a detailed image prompt:
Subject: ${task.params.subject || 'Based on context'}
Style: ${task.params.style || 'Modern, professional'}

Create a detailed, specific prompt suitable for an image generation model.`;
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const modelConfig = createModelConfig(selectModel('agent'));

      const result = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        prompt,
      });

      return { type: task.type, result: result.text };
    },
    'executeTask'
  );
}
