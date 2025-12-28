import { ClaudeAgentService } from '../../src/services/ClaudeAgentService';
import { OpenNotebookService } from '../../src/services/OpenNotebookService';

// Mock the Claude Agent SDK
const mockQuery = jest.fn();
jest.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: mockQuery,
}));

// Mock OpenNotebookService
jest.mock('../../src/services/OpenNotebookService');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ClaudeAgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('researchQuery', () => {
    it('should perform a research query successfully', async () => {
      // Mock OpenNotebook search
      const mockSearchResults = {
        results: [
          {
            id: '1',
            content: 'Relevant content about marketing',
            source_name: 'Marketing Guide',
            score: 0.9,
          },
        ],
        total_count: 1,
        search_type: 'vector',
      };

      (OpenNotebookService.search as jest.Mock).mockResolvedValue(
        mockSearchResults
      );

      // Mock Claude Agent response
      const mockMessages = [
        { result: 'Here is a comprehensive answer about content marketing...' },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      const result = await ClaudeAgentService.researchQuery({
        query: 'What are best practices for content marketing?',
      });

      expect(result.response).toBe(
        'Here is a comprehensive answer about content marketing...'
      );
      expect(result.sources).toHaveLength(1);
      expect(result.sources?.[0]?.name).toBe('Marketing Guide');
      expect(OpenNotebookService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'What are best practices for content marketing?',
          type: 'vector',
        })
      );
    });

    it('should handle queries without knowledge base context', async () => {
      // Mock empty search results
      (OpenNotebookService.search as jest.Mock).mockResolvedValue({
        results: [],
        total_count: 0,
        search_type: 'vector',
      });

      // Mock Claude Agent response
      mockQuery.mockImplementation(async function* () {
        yield { result: 'General answer without specific context' };
      });

      const result = await ClaudeAgentService.researchQuery({
        query: 'General question',
      });

      expect(result.response).toBe('General answer without specific context');
      expect(result.sources).toBeUndefined();
    });

    it('should include conversation history in the prompt', async () => {
      (OpenNotebookService.search as jest.Mock).mockResolvedValue({
        results: [],
        total_count: 0,
        search_type: 'vector',
      });

      mockQuery.mockImplementation(async function* () {
        yield { result: 'Response based on history' };
      });

      const history = [
        { role: 'user' as const, text: 'Previous question' },
        { role: 'assistant' as const, text: 'Previous answer' },
      ];

      await ClaudeAgentService.researchQuery({
        query: 'Follow-up question',
        history,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Follow-up question',
          options: expect.objectContaining({
            systemPrompt: expect.stringContaining('Previous question'),
          }),
        })
      );
    });

    it('should handle tool calls', async () => {
      (OpenNotebookService.search as jest.Mock).mockResolvedValue({
        results: [],
        total_count: 0,
        search_type: 'vector',
      });

      const mockMessages = [
        {
          tool_use: {
            name: 'WebSearch',
            result: { query: 'search term' },
          },
        },
        { result: 'Final response' },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      const result = await ClaudeAgentService.researchQuery({
        query: 'Research question',
      });

      expect(result.response).toBe('Final response');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]?.name).toBe('WebSearch');
    });

    it('should handle OpenNotebook search errors gracefully', async () => {
      (OpenNotebookService.search as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      mockQuery.mockImplementation(async function* () {
        yield { result: 'Answer without context' };
      });

      const result = await ClaudeAgentService.researchQuery({
        query: 'Question',
      });

      expect(result.response).toBe('Answer without context');
      // Should continue even if knowledge base is unavailable
    });

    it('should handle Claude Agent errors', async () => {
      (OpenNotebookService.search as jest.Mock).mockResolvedValue({
        results: [],
        total_count: 0,
        search_type: 'vector',
      });

      mockQuery.mockImplementation(async function* () {
        throw new Error('Agent error');
      });

      await expect(
        ClaudeAgentService.researchQuery({ query: 'Question' })
      ).rejects.toThrow('Agent error');
    });
  });

  describe('executeTask', () => {
    it('should execute create_article_draft task', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { result: '<h1>Article Title</h1><p>Article content...</p>' };
      });

      const result = await ClaudeAgentService.executeTask({
        type: 'create_article_draft',
        params: {
          title: 'My Article',
          topic: 'AI Technology',
          guidelines: 'Professional tone',
        },
      });

      expect(result.type).toBe('create_article_draft');
      expect(result.result).toContain('Article Title');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('My Article'),
        })
      );
    });

    it('should execute create_post_draft task', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          result: 'Exciting news about AI! 🚀 #AI #Technology #Innovation',
        };
      });

      const result = await ClaudeAgentService.executeTask({
        type: 'create_post_draft',
        params: {
          platform: 'Instagram',
          topic: 'AI News',
          tone: 'Exciting',
        },
      });

      expect(result.type).toBe('create_post_draft');
      expect(result.result).toContain('Exciting news');
    });

    it('should execute create_media_draft task', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          result:
            'A professional photograph of a modern office with AI technology displays',
        };
      });

      const result = await ClaudeAgentService.executeTask({
        type: 'create_media_draft',
        params: {
          subject: 'Office technology',
          style: 'Professional photography',
        },
      });

      expect(result.type).toBe('create_media_draft');
      expect(result.result).toContain('professional photograph');
    });

    it('should handle tasks with minimal parameters', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { result: 'Generated content based on context' };
      });

      const result = await ClaudeAgentService.executeTask({
        type: 'create_article_draft',
        params: {},
      });

      expect(result.result).toBe('Generated content based on context');
    });

    it('should throw error for unknown task type', async () => {
      await expect(
        ClaudeAgentService.executeTask({
          type: 'unknown_task' as any,
          params: {},
        })
      ).rejects.toThrow('Unknown task type');
    });

    it('should handle task execution errors', async () => {
      mockQuery.mockImplementation(async function* () {
        throw new Error('Task execution failed');
      });

      await expect(
        ClaudeAgentService.executeTask({
          type: 'create_article_draft',
          params: {},
        })
      ).rejects.toThrow('Task execution failed');
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { result: 'ok' };
      });

      const result = await ClaudeAgentService.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockQuery.mockImplementation(async function* () {
        throw new Error('Service error');
      });

      const result = await ClaudeAgentService.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when no result is returned', async () => {
      mockQuery.mockImplementation(async function* () {
        // Empty generator
      });

      const result = await ClaudeAgentService.healthCheck();

      expect(result).toBe(false);
    });
  });
});
