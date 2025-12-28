import { OpenNotebookService } from '../../src/services/OpenNotebookService';

// Mock node-fetch
const fetch = jest.fn();
jest.mock('node-fetch', () => ({
  default: jest.fn(),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('OpenNotebookService', () => {
  let fetch: jest.Mock;

  beforeAll(() => {
    fetch = require('node-fetch').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search the knowledge base successfully', async () => {
      const mockResponse = {
        results: [
          {
            id: '1',
            content: 'Search result content',
            source_name: 'Source 1',
            score: 0.95,
          },
        ],
        total_count: 1,
        search_type: 'vector',
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await OpenNotebookService.search({
        query: 'test query',
        type: 'vector',
        limit: 10,
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5055/search',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test query'),
        })
      );
    });

    it('should use default parameters when not provided', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], total_count: 0, search_type: 'text' }),
      });

      await OpenNotebookService.search({ query: 'test' });

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.type).toBe('text');
      expect(callBody.limit).toBe(100);
      expect(callBody.search_sources).toBe(true);
      expect(callBody.search_notes).toBe(true);
      expect(callBody.minimum_score).toBe(0.2);
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(
        OpenNotebookService.search({ query: 'test' })
      ).rejects.toThrow('Open Notebook API error: 500');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(
        OpenNotebookService.search({ query: 'test' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('ask', () => {
    it('should ask a question successfully', async () => {
      const mockResponse = {
        answer: 'This is the answer',
        question: 'What is AI?',
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await OpenNotebookService.ask({
        question: 'What is AI?',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5055/search/ask/simple',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should pass optional model parameters', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ answer: 'Answer', question: 'Q' }),
      });

      await OpenNotebookService.ask({
        question: 'Question',
        strategy_model: 'model-1',
        answer_model: 'model-2',
        final_answer_model: 'model-3',
      });

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.strategy_model).toBe('model-1');
      expect(callBody.answer_model).toBe('model-2');
      expect(callBody.final_answer_model).toBe('model-3');
    });
  });

  describe('getChatSessions', () => {
    it('should retrieve chat sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          notebook_id: 'notebook-1',
          title: 'Session 1',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
          message_count: 5,
        },
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockSessions,
      });

      const result = await OpenNotebookService.getChatSessions('notebook-1');

      expect(result).toEqual(mockSessions);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5055/chat/sessions?notebook_id=notebook-1',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('createChatSession', () => {
    it('should create a new chat session', async () => {
      const mockSession = {
        id: 'new-session',
        notebook_id: 'notebook-1',
        title: 'New Session',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        message_count: 0,
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockSession,
      });

      const result = await OpenNotebookService.createChatSession(
        'notebook-1',
        'New Session',
        'custom-model'
      );

      expect(result).toEqual(mockSession);
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.notebook_id).toBe('notebook-1');
      expect(callBody.title).toBe('New Session');
      expect(callBody.model_override).toBe('custom-model');
    });
  });

  describe('executeChat', () => {
    it('should execute a chat request', async () => {
      const mockResponse = {
        session_id: 'session-1',
        messages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await OpenNotebookService.executeChat({
        session_id: 'session-1',
        message: 'Hello',
        context: { key: 'value' },
      });

      expect(result).toEqual(mockResponse);
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.message).toBe('Hello');
      expect(callBody.context).toEqual({ key: 'value' });
    });
  });

  describe('buildContext', () => {
    it('should build context for a notebook', async () => {
      const mockContext = {
        context: { key: 'value' },
        token_count: 1000,
        char_count: 5000,
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockContext,
      });

      const result = await OpenNotebookService.buildContext('notebook-1', {
        maxTokens: 2000,
      });

      expect(result).toEqual(mockContext);
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.notebook_id).toBe('notebook-1');
      expect(callBody.maxTokens).toBe(2000);
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      fetch.mockResolvedValue({
        ok: true,
      });

      const result = await OpenNotebookService.healthCheck();

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://localhost:5055/docs');
    });

    it('should return false when service is unhealthy', async () => {
      fetch.mockRejectedValue(new Error('Connection refused'));

      const result = await OpenNotebookService.healthCheck();

      expect(result).toBe(false);
    });
  });
});
