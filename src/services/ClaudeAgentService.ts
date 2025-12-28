import { query } from "@anthropic-ai/claude-agent-sdk";
import { loadEnvConfig } from '../utils/env';
import logger from '../utils/logger';
import { OpenNotebookService } from './OpenNotebookService';

const config = loadEnvConfig();

export interface ResearchQuery {
  query: string;
  channelId?: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
  notebookId?: string;
}

export interface ResearchResponse {
  response: string;
  sources?: { name: string; content: string }[];
  toolCalls?: { name: string; result: any }[];
}

export interface AgentTask {
  type: 'create_article_draft' | 'create_post_draft' | 'create_media_draft';
  params: Record<string, any>;
}

export class ClaudeAgentService {
  /**
   * Research agent query with RAG support
   * Uses Open Notebook for knowledge base retrieval
   */
  static async researchQuery(request: ResearchQuery): Promise<ResearchResponse> {
    logger.info(`Research agent query: "${request.query.substring(0, 50)}..."`);

    // Step 1: Retrieve context from knowledge base if available
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
        sources = searchResults.results.map(r => ({
          name: r.source_name || 'Unknown Source',
          content: r.content,
        }));
        contextText = sources
          .map(s => `Source (${s.name}): ${s.content}`)
          .join('\n\n');
      }
    } catch (error) {
      logger.warn('Could not retrieve context from Open Notebook:', error);
      // Continue without context
    }

    // Step 2: Build the research prompt
    const historyContext = request.history
      ?.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n') || '';

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
3. If the context is empty or irrelevant, answer using your general knowledge.
4. Never say "I don't have information" - always provide a helpful answer.
5. Use Markdown formatting for readability.
6. If the user asks to create content (article, post, media), describe what you would create.`;

    // Step 3: Run the agent query
    let response = '';
    const toolCalls: { name: string; result: any }[] = [];

    try {
      for await (const message of query({
        prompt: request.query,
        options: {
          systemPrompt,
          allowedTools: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
          permissionMode: "bypassPermissions",
        },
      })) {
        if ('result' in message) {
          response = message.result as string;
        }
        if ('tool_use' in message) {
          toolCalls.push({
            name: (message as any).tool_use.name,
            result: (message as any).tool_use.result,
          });
        }
      }
    } catch (error) {
      logger.error('Claude Agent query failed:', error);
      throw error;
    }

    return {
      response,
      sources: sources.length > 0 ? sources : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Execute a content creation task
   */
  static async executeTask(task: AgentTask): Promise<Record<string, any>> {
    logger.info(`Executing agent task: ${task.type}`);

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

    let result = '';
    for await (const message of query({
      prompt,
      options: {
        allowedTools: [],
        permissionMode: "bypassPermissions",
      },
    })) {
      if ('result' in message) {
        result = message.result as string;
      }
    }

    return { type: task.type, result };
  }

  /**
   * Health check for Claude Agent SDK
   */
  static async healthCheck(): Promise<boolean> {
    try {
      // Simple query to verify SDK is working
      for await (const message of query({
        prompt: "Say 'ok' in one word",
        options: {
          allowedTools: [],
          permissionMode: "bypassPermissions",
        },
      })) {
        if ('result' in message) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}
