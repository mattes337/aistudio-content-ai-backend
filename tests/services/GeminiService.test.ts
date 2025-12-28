// Mock logger first (must be before imports)
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the @google/genai module
jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn();

  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    Type: {
      OBJECT: 'object',
      STRING: 'string',
      ARRAY: 'array',
    },
    Modality: {
      IMAGE: 'image',
    },
  };
});

import { GeminiService } from '../../src/services/GeminiService';

describe('GeminiService', () => {
  const { GoogleGenAI } = require('@google/genai');
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const aiInstance = new GoogleGenAI();
    mockGenerateContent = aiInstance.models.generateContent;
  });

  describe('refineContent', () => {
    it('should refine content successfully', async () => {
      const mockResponse = {
        text: JSON.stringify({
          content: 'Refined content here',
          chatResponse: 'I made it more engaging!',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.refineContent(
        'Original content',
        'Make it more engaging',
        'article',
        []
      );

      expect(result).toEqual({
        content: 'Refined content here',
        chatResponse: 'I made it more engaging!',
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle content refinement with history', async () => {
      const mockResponse = {
        text: JSON.stringify({
          content: 'Updated content',
          chatResponse: 'Added your requested changes',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const history = [
        { role: 'user' as const, text: 'Add more details' },
        { role: 'assistant' as const, text: 'I added more details' },
      ];

      const result = await GeminiService.refineContent(
        'Original content',
        'Now add examples',
        'article',
        history
      );

      expect(result).toEqual({
        content: 'Updated content',
        chatResponse: 'Added your requested changes',
      });
    });

    it('should handle different content types', async () => {
      const mockResponse = {
        text: JSON.stringify({
          content: 'Newsletter content',
          chatResponse: 'Created newsletter',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.refineContent(
        '',
        'Create a newsletter about AI',
        'newsletter',
        []
      );

      expect(result.content).toBe('Newsletter content');
    });

    it('should handle errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        GeminiService.refineContent('content', 'instruction', 'article', [])
      ).rejects.toThrow('API Error');
    });
  });

  describe('generateTitle', () => {
    it('should generate a title successfully', async () => {
      const mockResponse = {
        text: JSON.stringify({
          title: 'Amazing Article Title',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generateTitle('Article content here...');

      expect(result).toEqual({
        title: 'Amazing Article Title',
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle long content by truncating', async () => {
      const mockResponse = {
        text: JSON.stringify({
          title: 'Generated Title',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const longContent = 'a'.repeat(3000);
      await GeminiService.generateTitle(longContent);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents.length).toBeLessThanOrEqual(2100); // Truncated + prompt
    });
  });

  describe('generateSubject', () => {
    it('should generate a newsletter subject line', async () => {
      const mockResponse = {
        text: JSON.stringify({
          subject: 'Your Weekly AI Newsletter',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generateSubject('Newsletter content...');

      expect(result).toEqual({
        subject: 'Your Weekly AI Newsletter',
      });
    });
  });

  describe('generateMetadata', () => {
    it('should generate SEO metadata and excerpt', async () => {
      const mockResponse = {
        text: JSON.stringify({
          seo: {
            title: 'SEO Title',
            description: 'SEO Description',
            keywords: 'ai, content, automation',
            slug: 'seo-title',
          },
          excerpt: 'This is a short excerpt...',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generateMetadata('Content...', 'Title');

      expect(result).toEqual({
        seo: {
          title: 'SEO Title',
          description: 'SEO Description',
          keywords: 'ai, content, automation',
          slug: 'seo-title',
        },
        excerpt: 'This is a short excerpt...',
      });
    });
  });

  describe('generateExcerpt', () => {
    it('should generate an excerpt', async () => {
      const mockResponse = {
        text: JSON.stringify({
          excerpt: 'This is the excerpt',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generateExcerpt('Long content...');

      expect(result).toEqual({
        excerpt: 'This is the excerpt',
      });
    });
  });

  describe('generatePreviewText', () => {
    it('should generate preview text for newsletter', async () => {
      const mockResponse = {
        text: JSON.stringify({
          previewText: 'Preview text here',
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generatePreviewText('Newsletter...');

      expect(result).toEqual({
        previewText: 'Preview text here',
      });
    });
  });

  describe('generatePostDetails', () => {
    it('should generate post details with tags', async () => {
      const mockResponse = {
        text: JSON.stringify({
          content: 'Amazing post caption! 🚀',
          altText: 'Image showing amazing content',
          tags: ['ai', 'tech', 'innovation'],
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generatePostDetails(
        'Create a post about AI',
        'Current caption'
      );

      expect(result).toEqual({
        content: 'Amazing post caption! 🚀',
        altText: 'Image showing amazing content',
        tags: ['#ai', '#tech', '#innovation'],
      });
    });

    it('should handle tags with # already present', async () => {
      const mockResponse = {
        text: JSON.stringify({
          content: 'Post content',
          altText: 'Alt text',
          tags: ['#alreadyHashtagged', 'needsHashtag'],
        }),
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generatePostDetails('prompt', '');

      expect(result.tags).toEqual(['#alreadyHashtagged', '#needsHashtag']);
    });
  });

  describe('generateImage', () => {
    it('should generate an image successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64ImageData',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          },
        ],
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.generateImage('A beautiful landscape');

      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,base64ImageData',
        base64Image: 'base64ImageData',
        mimeType: 'image/png',
      });
    });

    it('should handle custom aspect ratio', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64Data',
                    mimeType: 'image/jpeg',
                  },
                },
              ],
            },
          },
        ],
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await GeminiService.generateImage('Portrait photo', '9:16');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents.parts[0].text).toContain('9:16');
    });

    it('should throw error when no image is generated', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [],
            },
          },
        ],
      });

      await expect(GeminiService.generateImage('prompt')).rejects.toThrow(
        'No image generated from model'
      );
    });
  });

  describe('editImage', () => {
    it('should edit an image successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'editedImageData',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          },
        ],
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await GeminiService.editImage(
        'base64Data',
        'image/png',
        'Make it brighter'
      );

      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,editedImageData',
        base64Image: 'editedImageData',
      });
    });

    it('should throw error when image edit fails', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [],
            },
          },
        ],
      });

      await expect(
        GeminiService.editImage('data', 'image/png', 'prompt')
      ).rejects.toThrow('No image edited');
    });
  });

  describe('inferMetadata', () => {
    it('should infer metadata for article type', async () => {
      const titleResponse = {
        text: JSON.stringify({ title: 'Article Title' }),
      };
      const metadataResponse = {
        text: JSON.stringify({
          seo: {
            title: 'SEO Title',
            description: 'Description',
            keywords: 'keywords',
            slug: 'slug',
          },
          excerpt: 'Excerpt',
        }),
      };

      mockGenerateContent
        .mockResolvedValueOnce(titleResponse)
        .mockResolvedValueOnce(metadataResponse);

      const result = await GeminiService.inferMetadata('Content', 'article');

      expect(result.title).toBe('Article Title');
      expect(result.seo).toBeDefined();
      expect(result.excerpt).toBeDefined();
    });

    it('should infer metadata for newsletter type', async () => {
      const subjectResponse = {
        text: JSON.stringify({ subject: 'Newsletter Subject' }),
      };
      const previewResponse = {
        text: JSON.stringify({ previewText: 'Preview' }),
      };

      mockGenerateContent
        .mockResolvedValueOnce(subjectResponse)
        .mockResolvedValueOnce(previewResponse);

      const result = await GeminiService.inferMetadata('Content', 'newsletter');

      expect(result.subject).toBe('Newsletter Subject');
      expect(result.previewText).toBe('Preview');
    });

    it('should infer metadata for post type', async () => {
      const postDetailsResponse = {
        text: JSON.stringify({
          content: 'Post content',
          altText: 'Alt text',
          tags: ['tag1', 'tag2'],
        }),
      };

      mockGenerateContent.mockResolvedValueOnce(postDetailsResponse);

      const result = await GeminiService.inferMetadata('Caption', 'post');

      expect(result.content).toBe('Post content');
      expect(result.altText).toBe('Alt text');
      expect(result.tags).toHaveLength(2);
    });
  });
});
