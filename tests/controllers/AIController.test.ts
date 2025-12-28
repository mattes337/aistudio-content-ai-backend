import { Request, Response } from 'express';
import { AIController } from '../../src/controllers/AIController';
import { GeminiService } from '../../src/services/GeminiService';
import { ClaudeAgentService } from '../../src/services/ClaudeAgentService';
import { OpenNotebookService } from '../../src/services/OpenNotebookService';

// Mock all services
jest.mock('../../src/services/GeminiService');
jest.mock('../../src/services/ClaudeAgentService');
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

describe('AIController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('Gemini Endpoints', () => {
    describe('refineContent', () => {
      it('should refine content successfully', async () => {
        mockRequest.body = {
          currentContent: 'Original content',
          instruction: 'Make it better',
          type: 'article',
        };

        const mockResult = {
          content: 'Refined content',
          chatResponse: 'I improved it!',
        };

        (GeminiService.refineContent as jest.Mock).mockResolvedValue(mockResult);

        await AIController.refineContent(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(GeminiService.refineContent).toHaveBeenCalledWith(
          'Original content',
          'Make it better',
          'article',
          []
        );
        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if instruction is missing', async () => {
        mockRequest.body = { type: 'article' };

        await AIController.refineContent(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          message: 'Instruction is required',
        });
      });

      it('should return 400 if type is invalid', async () => {
        mockRequest.body = {
          instruction: 'Make it better',
          type: 'invalid',
        };

        await AIController.refineContent(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          message: 'Valid type (article, post, newsletter) is required',
        });
      });

      it('should handle errors', async () => {
        mockRequest.body = {
          instruction: 'test',
          type: 'article',
        };

        (GeminiService.refineContent as jest.Mock).mockRejectedValue(
          new Error('API Error')
        );

        await AIController.refineContent(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
          message: 'Internal server error',
        });
      });
    });

    describe('generateTitle', () => {
      it('should generate title successfully', async () => {
        mockRequest.body = { content: 'Article content' };
        const mockResult = { title: 'Generated Title' };

        (GeminiService.generateTitle as jest.Mock).mockResolvedValue(mockResult);

        await AIController.generateTitle(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(GeminiService.generateTitle).toHaveBeenCalledWith(
          'Article content'
        );
        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if content is missing', async () => {
        mockRequest.body = {};

        await AIController.generateTitle(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
      });
    });

    describe('generateMetadata', () => {
      it('should generate metadata successfully', async () => {
        mockRequest.body = {
          content: 'Article content',
          title: 'Article Title',
        };

        const mockResult = {
          seo: {
            title: 'SEO Title',
            description: 'Description',
            keywords: 'keywords',
            slug: 'slug',
          },
          excerpt: 'Excerpt',
        };

        (GeminiService.generateMetadata as jest.Mock).mockResolvedValue(
          mockResult
        );

        await AIController.generateMetadata(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if content or title is missing', async () => {
        mockRequest.body = { content: 'test' };

        await AIController.generateMetadata(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
      });
    });

    describe('generateImageNew', () => {
      it('should generate image successfully', async () => {
        mockRequest.body = {
          prompt: 'A beautiful landscape',
          aspectRatio: '16:9',
        };

        const mockResult = {
          imageUrl: 'data:image/png;base64,abc',
          base64Image: 'abc',
          mimeType: 'image/png',
        };

        (GeminiService.generateImage as jest.Mock).mockResolvedValue(mockResult);

        await AIController.generateImageNew(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(GeminiService.generateImage).toHaveBeenCalledWith(
          'A beautiful landscape',
          '16:9'
        );
        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });
    });

    describe('editImageNew', () => {
      it('should edit image successfully', async () => {
        mockRequest.body = {
          base64ImageData: 'base64data',
          mimeType: 'image/png',
          prompt: 'Make it brighter',
        };

        const mockResult = {
          imageUrl: 'data:image/png;base64,edited',
          base64Image: 'edited',
        };

        (GeminiService.editImage as jest.Mock).mockResolvedValue(mockResult);

        await AIController.editImageNew(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(GeminiService.editImage).toHaveBeenCalledWith(
          'base64data',
          'image/png',
          'Make it brighter'
        );
        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });
    });

    describe('inferMetadata', () => {
      it('should infer metadata successfully', async () => {
        mockRequest.body = {
          content: 'Content',
          type: 'article',
        };

        const mockResult = { title: 'Title', seo: {}, excerpt: 'Excerpt' };

        (GeminiService.inferMetadata as jest.Mock).mockResolvedValue(mockResult);

        await AIController.inferMetadata(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });
    });
  });

  describe('Claude Agent Endpoints', () => {
    describe('researchQuery', () => {
      it('should perform research query successfully', async () => {
        mockRequest.body = {
          query: 'Research question',
          history: [],
        };

        const mockResult = {
          response: 'Research answer',
          sources: [{ name: 'Source', content: 'Content' }],
        };

        (ClaudeAgentService.researchQuery as jest.Mock).mockResolvedValue(
          mockResult
        );

        await AIController.researchQuery(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(ClaudeAgentService.researchQuery).toHaveBeenCalledWith({
          query: 'Research question',
          channelId: undefined,
          history: [],
          notebookId: undefined,
        });
        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if query is missing', async () => {
        mockRequest.body = {};

        await AIController.researchQuery(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should handle errors', async () => {
        mockRequest.body = { query: 'test' };

        (ClaudeAgentService.researchQuery as jest.Mock).mockRejectedValue(
          new Error('Agent error')
        );

        await AIController.researchQuery(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(500);
      });
    });

    describe('executeAgentTask', () => {
      it('should execute agent task successfully', async () => {
        mockRequest.body = {
          type: 'create_article_draft',
          params: { title: 'Article' },
        };

        const mockResult = {
          type: 'create_article_draft',
          result: 'Generated article',
        };

        (ClaudeAgentService.executeTask as jest.Mock).mockResolvedValue(
          mockResult
        );

        await AIController.executeAgentTask(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if type is missing', async () => {
        mockRequest.body = {};

        await AIController.executeAgentTask(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should return 400 for invalid task type', async () => {
        mockRequest.body = { type: 'invalid_type' };

        await AIController.executeAgentTask(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid task type'),
          })
        );
      });
    });
  });

  describe('Open Notebook Endpoints', () => {
    describe('searchKnowledgeBase', () => {
      it('should search knowledge base successfully', async () => {
        mockRequest.body = {
          query: 'search query',
          type: 'vector',
          limit: 10,
        };

        const mockResult = {
          results: [{ id: '1', content: 'Result' }],
          total_count: 1,
          search_type: 'vector',
        };

        (OpenNotebookService.search as jest.Mock).mockResolvedValue(mockResult);

        await AIController.searchKnowledgeBase(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(OpenNotebookService.search).toHaveBeenCalledWith({
          query: 'search query',
          type: 'vector',
          limit: 10,
          minimum_score: undefined,
        });
        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if query is missing', async () => {
        mockRequest.body = {};

        await AIController.searchKnowledgeBase(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
      });
    });

    describe('askKnowledgeBase', () => {
      it('should ask knowledge base successfully', async () => {
        mockRequest.body = {
          question: 'What is AI?',
        };

        const mockResult = {
          answer: 'AI is...',
          question: 'What is AI?',
        };

        (OpenNotebookService.ask as jest.Mock).mockResolvedValue(mockResult);

        await AIController.askKnowledgeBase(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(jsonMock).toHaveBeenCalledWith(mockResult);
      });

      it('should return 400 if question is missing', async () => {
        mockRequest.body = {};

        await AIController.askKnowledgeBase(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      (OpenNotebookService.healthCheck as jest.Mock).mockResolvedValue(true);
      (ClaudeAgentService.healthCheck as jest.Mock).mockResolvedValue(true);

      // Set environment variable for test
      process.env.GEMINI_API_KEY = 'test-key';

      await AIController.healthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'ok',
        services: {
          gemini: true,
          claude_agent: true,
          open_notebook: true,
        },
      });
    });

    it('should handle health check with failed services', async () => {
      (OpenNotebookService.healthCheck as jest.Mock).mockResolvedValue(false);
      (ClaudeAgentService.healthCheck as jest.Mock).mockResolvedValue(false);

      await AIController.healthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'ok',
        services: {
          gemini: expect.any(Boolean),
          claude_agent: false,
          open_notebook: false,
        },
      });
    });
  });
});
