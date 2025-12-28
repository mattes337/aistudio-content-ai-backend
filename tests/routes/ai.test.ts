import request from 'supertest';
import express, { Express } from 'express';
import aiRoutes from '../../src/routes/ai';
import { GeminiService } from '../../src/services/GeminiService';
import { ClaudeAgentService } from '../../src/services/ClaudeAgentService';
import { OpenNotebookService } from '../../src/services/OpenNotebookService';

// Mock all services
jest.mock('../../src/services/GeminiService');
jest.mock('../../src/services/ClaudeAgentService');
jest.mock('../../src/services/OpenNotebookService');
jest.mock('../../src/services/AIService');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth middleware to bypass authentication in tests
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

describe('AI Routes Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai', aiRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ai/refine-content', () => {
    it('should refine content successfully', async () => {
      const mockResult = {
        content: 'Refined content',
        chatResponse: 'I improved it!',
      };

      (GeminiService.refineContent as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/refine-content')
        .send({
          currentContent: 'Original',
          instruction: 'Make it better',
          type: 'article',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 for missing instruction', async () => {
      const response = await request(app)
        .post('/api/ai/refine-content')
        .send({
          type: 'article',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/ai/generate/title', () => {
    it('should generate title successfully', async () => {
      const mockResult = { title: 'Generated Title' };
      (GeminiService.generateTitle as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/generate/title')
        .send({ content: 'Article content' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/generate/subject', () => {
    it('should generate newsletter subject', async () => {
      const mockResult = { subject: 'Newsletter Subject' };
      (GeminiService.generateSubject as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/generate/subject')
        .send({ content: 'Newsletter content' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/generate/metadata', () => {
    it('should generate metadata successfully', async () => {
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

      const response = await request(app)
        .post('/api/ai/generate/metadata')
        .send({
          content: 'Article content',
          title: 'Article Title',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/generate/excerpt', () => {
    it('should generate excerpt successfully', async () => {
      const mockResult = { excerpt: 'Generated excerpt' };
      (GeminiService.generateExcerpt as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/generate/excerpt')
        .send({ content: 'Long article content...' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/generate/preview-text', () => {
    it('should generate preview text successfully', async () => {
      const mockResult = { previewText: 'Preview text' };
      (GeminiService.generatePreviewText as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/generate/preview-text')
        .send({ content: 'Newsletter content' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/generate/post-details-v2', () => {
    it('should generate post details successfully', async () => {
      const mockResult = {
        content: 'Post caption',
        altText: 'Alt text',
        tags: ['#tag1', '#tag2'],
      };

      (GeminiService.generatePostDetails as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/generate/post-details-v2')
        .send({
          prompt: 'Create a post about AI',
          currentCaption: 'Caption',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/generate/image-v2', () => {
    it('should generate image successfully', async () => {
      const mockResult = {
        imageUrl: 'data:image/png;base64,abc',
        base64Image: 'abc',
        mimeType: 'image/png',
      };

      (GeminiService.generateImage as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/generate/image-v2')
        .send({
          prompt: 'A beautiful landscape',
          aspectRatio: '16:9',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/edit/image-v2', () => {
    it('should edit image successfully', async () => {
      const mockResult = {
        imageUrl: 'data:image/png;base64,edited',
        base64Image: 'edited',
      };

      (GeminiService.editImage as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/edit/image-v2')
        .send({
          base64ImageData: 'base64data',
          mimeType: 'image/png',
          prompt: 'Make it brighter',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/infer-metadata', () => {
    it('should infer metadata successfully', async () => {
      const mockResult = {
        title: 'Title',
        seo: {},
        excerpt: 'Excerpt',
      };

      (GeminiService.inferMetadata as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/infer-metadata')
        .send({
          content: 'Content',
          type: 'article',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/research', () => {
    it('should perform research query successfully', async () => {
      const mockResult = {
        response: 'Research answer',
        sources: [{ name: 'Source', content: 'Content' }],
      };

      (ClaudeAgentService.researchQuery as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/research')
        .send({
          query: 'What are best practices?',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should handle research with history', async () => {
      const mockResult = {
        response: 'Follow-up answer',
        sources: [],
      };

      (ClaudeAgentService.researchQuery as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/research')
        .send({
          query: 'Follow-up question',
          history: [
            { role: 'user', text: 'Previous question' },
            { role: 'assistant', text: 'Previous answer' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/agent/task', () => {
    it('should execute article creation task', async () => {
      const mockResult = {
        type: 'create_article_draft',
        result: 'Generated article',
      };

      (ClaudeAgentService.executeTask as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/agent/task')
        .send({
          type: 'create_article_draft',
          params: { title: 'Article', topic: 'AI' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should execute post creation task', async () => {
      const mockResult = {
        type: 'create_post_draft',
        result: 'Generated post',
      };

      (ClaudeAgentService.executeTask as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/agent/task')
        .send({
          type: 'create_post_draft',
          params: { platform: 'Instagram', topic: 'Tech' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should execute media creation task', async () => {
      const mockResult = {
        type: 'create_media_draft',
        result: 'Generated image prompt',
      };

      (ClaudeAgentService.executeTask as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/ai/agent/task')
        .send({
          type: 'create_media_draft',
          params: { subject: 'Office', style: 'Professional' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /api/ai/knowledge/search', () => {
    it('should search knowledge base successfully', async () => {
      const mockResult = {
        results: [
          {
            id: '1',
            content: 'Result content',
            source_name: 'Source',
            score: 0.9,
          },
        ],
        total_count: 1,
        search_type: 'vector',
      };

      (OpenNotebookService.search as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/knowledge/search')
        .send({
          query: 'search query',
          type: 'vector',
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should handle text search', async () => {
      const mockResult = {
        results: [],
        total_count: 0,
        search_type: 'text',
      };

      (OpenNotebookService.search as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/knowledge/search')
        .send({
          query: 'exact text search',
          type: 'text',
        });

      expect(response.status).toBe(200);
      expect(response.body.search_type).toBe('text');
    });
  });

  describe('POST /api/ai/knowledge/ask', () => {
    it('should ask knowledge base successfully', async () => {
      const mockResult = {
        answer: 'This is the answer',
        question: 'What is AI?',
      };

      (OpenNotebookService.ask as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/knowledge/ask')
        .send({
          question: 'What is AI?',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should pass custom model parameters', async () => {
      const mockResult = {
        answer: 'Answer with custom models',
        question: 'Question',
      };

      (OpenNotebookService.ask as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ai/knowledge/ask')
        .send({
          question: 'Question',
          strategy_model: 'model-1',
          answer_model: 'model-2',
          final_answer_model: 'model-3',
        });

      expect(response.status).toBe(200);
      expect(OpenNotebookService.ask).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy_model: 'model-1',
          answer_model: 'model-2',
          final_answer_model: 'model-3',
        })
      );
    });
  });

  describe('GET /api/ai/health', () => {
    it('should return health status with all services healthy', async () => {
      (OpenNotebookService.healthCheck as jest.Mock).mockResolvedValue(true);
      (ClaudeAgentService.healthCheck as jest.Mock).mockResolvedValue(true);

      process.env.GEMINI_API_KEY = 'test-key';

      const response = await request(app).get('/api/ai/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        services: {
          gemini: true,
          claude_agent: true,
          open_notebook: true,
        },
      });
    });

    it('should return health status with some services down', async () => {
      (OpenNotebookService.healthCheck as jest.Mock).mockResolvedValue(false);
      (ClaudeAgentService.healthCheck as jest.Mock).mockResolvedValue(false);

      const response = await request(app).get('/api/ai/health');

      expect(response.status).toBe(200);
      expect(response.body.services.claude_agent).toBe(false);
      expect(response.body.services.open_notebook).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (GeminiService.refineContent as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/api/ai/refine-content')
        .send({
          instruction: 'test',
          type: 'article',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error',
      });
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/ai/refine-content')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});
