import { z } from 'zod/v3';
import { tool } from 'ai';
import { loadEnvConfig } from '../../../utils/env';
import logger from '../../../utils/logger';

const config = loadEnvConfig();

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

/**
 * Check if web search is available (Tavily API key configured)
 */
export function isWebSearchAvailable(): boolean {
  return !!config.tavilyApiKey;
}

/**
 * Perform web search using Tavily API
 */
async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    includeAnswer?: boolean;
    searchDepth?: 'basic' | 'advanced';
  } = {}
): Promise<TavilySearchResponse> {
  const { maxResults = 5, includeAnswer = false, searchDepth = 'basic' } = options;

  if (!config.tavilyApiKey) {
    throw new Error('Tavily API key not configured');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query,
      max_results: maxResults,
      include_answer: includeAnswer,
      search_depth: searchDepth,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Tavily API error: ${response.status} - ${errorText}`);
    throw new Error(`Web search failed: ${response.statusText}`);
  }

  return response.json() as Promise<TavilySearchResponse>;
}

// Web search tool - searches the internet for current information
const webSearchInputSchema = z.object({
  query: z.string().describe('The search query to find information on the web'),
  maxResults: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum number of results to return (1-10)'),
});

export const webSearchTool = tool({
  description:
    'Search the web for current information. Use this when you need up-to-date information from the internet, news, recent events, or information that may not be in the knowledge base.',
  inputSchema: webSearchInputSchema,
  execute: async ({ query, maxResults }) => {
    logger.info(`Tool: webSearch - query: "${query.substring(0, 50)}..."`);
    try {
      const result = await searchWeb(query, {
        maxResults: Math.min(maxResults, 10),
        includeAnswer: false,
        searchDepth: 'basic',
      });

      logger.info(`webSearch results: ${result.results.length} returned`);

      return {
        success: true,
        results: result.results.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
          publishedDate: r.published_date,
        })),
        totalCount: result.results.length,
      };
    } catch (error) {
      logger.error('webSearch tool failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search the web',
      };
    }
  },
});

// Multiple web searches tool - batch search for comparing topics
const webSearchMultipleInputSchema = z.object({
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Array of search queries to execute (max 5)'),
  maxResultsPerQuery: z
    .number()
    .optional()
    .default(3)
    .describe('Maximum results per query'),
});

export const webSearchMultipleTool = tool({
  description:
    'Search the web for multiple topics simultaneously. Use this when comparing concepts from the web, gathering breadth of current information, or researching several related topics.',
  inputSchema: webSearchMultipleInputSchema,
  execute: async ({ queries, maxResultsPerQuery }) => {
    logger.info(`Tool: webSearchMultiple - ${queries.length} queries`);
    try {
      const searchPromises = queries.map(async (query) => {
        const result = await searchWeb(query, {
          maxResults: Math.min(maxResultsPerQuery, 5),
          includeAnswer: false,
          searchDepth: 'basic',
        });

        logger.info(`webSearchMultiple query "${query.substring(0, 30)}...": ${result.results.length} returned`);

        return {
          query,
          results: result.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
            publishedDate: r.published_date,
          })),
        };
      });

      const results = await Promise.all(searchPromises);
      const totalResults = results.reduce((sum, r) => sum + r.results.length, 0);
      logger.info(`webSearchMultiple completed: ${totalResults} total results across ${queries.length} queries`);

      return {
        success: true,
        searches: results,
        totalQueries: queries.length,
      };
    } catch (error) {
      logger.error('webSearchMultiple tool failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute multiple web searches',
      };
    }
  },
});
