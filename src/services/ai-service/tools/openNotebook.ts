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
