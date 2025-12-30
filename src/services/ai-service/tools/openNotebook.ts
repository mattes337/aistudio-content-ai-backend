import { z } from 'zod/v3';
import { tool } from 'ai';
import { OpenNotebookService } from '../../OpenNotebookService';
import logger from '../../../utils/logger';

// Search tool - searches the knowledge base
const searchInputSchema = z.object({
  query: z.string().describe('The search query to find relevant knowledge'),
  type: z
    .enum(['text', 'vector'])
    .optional()
    .default('vector')
    .describe('Search type: vector for semantic, text for keyword'),
  limit: z.number().optional().default(5).describe('Maximum number of results to return'),
  minimum_score: z.number().optional().default(0.3).describe('Minimum relevance score (0-1)'),
});

export const searchKnowledgeTool = tool({
  description:
    'Search the knowledge base for relevant information. Use this when you need to find specific content, facts, or context from the stored knowledge sources.',
  inputSchema: searchInputSchema,
  execute: async ({ query, type, limit, minimum_score }) => {
    logger.info(`Tool: searchKnowledge - query: "${query.substring(0, 50)}..."`);
    try {
      const results = await OpenNotebookService.search({
        query,
        type: type as 'text' | 'vector',
        limit,
        minimum_score,
      });
      return {
        success: true,
        results: results.results.map((r) => ({
          content: r.content,
          source: r.source_name || 'Unknown',
          score: r.score,
        })),
        totalCount: results.total_count,
      };
    } catch (error) {
      logger.error('searchKnowledge tool failed:', error);
      return { success: false, error: 'Failed to search knowledge base' };
    }
  },
});

// Ask tool - asks a question and gets an AI-synthesized answer
const askInputSchema = z.object({
  question: z.string().describe('The question to ask the knowledge base'),
});

export const askKnowledgeTool = tool({
  description:
    'Ask a question to the knowledge base and receive a comprehensive answer synthesized from multiple sources. Use this for complex questions that require reasoning over multiple pieces of information.',
  inputSchema: askInputSchema,
  execute: async ({ question }) => {
    logger.info(`Tool: askKnowledge - question: "${question.substring(0, 50)}..."`);
    try {
      const result = await OpenNotebookService.ask({ question });
      return {
        success: true,
        answer: result.answer,
        question: result.question,
      };
    } catch (error) {
      logger.error('askKnowledge tool failed:', error);
      return { success: false, error: 'Failed to query knowledge base' };
    }
  },
});

// Chat with notebook tool - multi-turn conversation with knowledge context
// Maintains session state for follow-up questions
const chatSessionCache = new Map<string, string>(); // notebookId -> sessionId

const chatInputSchema = z.object({
  message: z.string().describe('The message to send in the conversation'),
  notebookId: z.string().describe('The notebook ID to chat with'),
  newSession: z.boolean().optional().default(false).describe('Start a new conversation session'),
});

export const chatWithNotebookTool = tool({
  description:
    'Have a multi-turn conversation with the knowledge base. Use this for follow-up questions, clarifications, or exploring a topic in depth. The conversation context is maintained across calls.',
  inputSchema: chatInputSchema,
  execute: async ({ message, notebookId, newSession }) => {
    logger.info(`Tool: chatWithNotebook - message: "${message.substring(0, 50)}..."`);
    try {
      let sessionId = chatSessionCache.get(notebookId);

      // Create new session if needed
      if (!sessionId || newSession) {
        const session = await OpenNotebookService.createChatSession(
          notebookId,
          `Research session ${new Date().toISOString()}`
        );
        sessionId = session.id;
        chatSessionCache.set(notebookId, sessionId);
      }

      // Execute chat
      const result = await OpenNotebookService.executeChat({
        session_id: sessionId,
        message,
      });

      // Extract assistant response from messages
      const assistantMessages = result.messages.filter((m) => m.role === 'assistant');
      const latestResponse = assistantMessages[assistantMessages.length - 1]?.content || '';

      return {
        success: true,
        response: latestResponse,
        sessionId: result.session_id,
        messageCount: result.messages.length,
      };
    } catch (error) {
      logger.error('chatWithNotebook tool failed:', error);
      return { success: false, error: 'Failed to chat with knowledge base' };
    }
  },
});

// Build context tool - get full notebook context
const buildContextInputSchema = z.object({
  notebookId: z.string().describe('The notebook ID to build context from'),
});

export const buildContextTool = tool({
  description:
    'Retrieve the full context from a notebook. Use this when you need a comprehensive overview of all knowledge in the notebook, or when preparing for a detailed response that requires broad context.',
  inputSchema: buildContextInputSchema,
  execute: async ({ notebookId }) => {
    logger.info(`Tool: buildContext - notebookId: ${notebookId}`);
    try {
      const result = await OpenNotebookService.buildContext(notebookId);
      return {
        success: true,
        context: result.context,
        tokenCount: result.token_count,
        charCount: result.char_count,
      };
    } catch (error) {
      logger.error('buildContext tool failed:', error);
      return { success: false, error: 'Failed to build context from notebook' };
    }
  },
});

// Search multiple queries tool - batch search for comparing topics
const searchMultipleInputSchema = z.object({
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Array of search queries to execute in parallel (max 5)'),
  type: z
    .enum(['text', 'vector'])
    .optional()
    .default('vector')
    .describe('Search type: vector for semantic, text for keyword'),
  limitPerQuery: z.number().optional().default(3).describe('Maximum results per query'),
});

export const searchMultipleTool = tool({
  description:
    'Search for multiple topics simultaneously. Use this when comparing concepts, gathering breadth of information, or when you need context on several related but distinct topics.',
  inputSchema: searchMultipleInputSchema,
  execute: async ({ queries, type, limitPerQuery }) => {
    logger.info(`Tool: searchMultiple - ${queries.length} queries`);
    try {
      // Execute all searches in parallel
      const searchPromises = queries.map((query) =>
        OpenNotebookService.search({
          query,
          type: type as 'text' | 'vector',
          limit: limitPerQuery,
          minimum_score: 0.25,
        }).then((results) => ({
          query,
          results: results.results.map((r) => ({
            content: r.content,
            source: r.source_name || 'Unknown',
            score: r.score,
          })),
          totalCount: results.total_count,
        }))
      );

      const results = await Promise.all(searchPromises);

      return {
        success: true,
        searches: results,
        totalQueries: queries.length,
      };
    } catch (error) {
      logger.error('searchMultiple tool failed:', error);
      return { success: false, error: 'Failed to execute multiple searches' };
    }
  },
});
