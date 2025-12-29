/**
 * AIService Integration Tests
 *
 * These tests make real API calls to Gemini.
 * Run with: npm test -- --testPathPatterns=AIService.integration
 *
 * Prerequisites:
 * - GEMINI_API_KEY must be set in .env
 */

import { AIService } from '../../src/services/ai-service';

// Increase timeout for API calls
jest.setTimeout(120000);

describe('AIService Integration Tests', () => {
  // Check if API key is available (setup.ts loads .env first)
  const hasApiKey = !!process.env.GEMINI_API_KEY &&
                    process.env.GEMINI_API_KEY !== 'test-gemini-key' &&
                    process.env.GEMINI_API_KEY.length > 10;

  // Restore console for debugging in integration tests
  beforeAll(() => {
    global.console = require('console');
    if (!hasApiKey) {
      console.warn('⚠️  GEMINI_API_KEY not set - skipping integration tests');
    }
  });

  describe('Health Check', () => {
    it('should verify API connectivity', async () => {
      if (!hasApiKey) return;

      const isHealthy = await AIService.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Content Generation', () => {
    it('should generate a title from content', async () => {
      if (!hasApiKey) return;

      const content = `Artificial intelligence is transforming how businesses operate across every industry.
        From intelligent automation to advanced analytics, AI tools are becoming essential for gaining
        competitive advantage in the modern marketplace. Companies leveraging these technologies are seeing
        significant improvements in efficiency, customer satisfaction, and revenue growth.`;

      // Retry wrapper for flaky LLM behavior
      let result: any;
      for (let i = 0; i < 3; i++) {
        try {
          result = await AIService.generateTitle(content);
          break;
        } catch (e) {
          if (i === 2) throw e;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      expect(result).toHaveProperty('title');
      expect(typeof result.title).toBe('string');
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.title.length).toBeLessThanOrEqual(100);

      console.log('Generated title:', result.title);
    });

    it('should generate an excerpt from content', async () => {
      if (!hasApiKey) return;

      const content = `
        Machine learning algorithms are revolutionizing data analysis.
        Companies can now predict customer behavior with unprecedented accuracy.
        This technology is becoming accessible to businesses of all sizes.
      `;

      const result = await AIService.generateExcerpt(content);

      expect(result).toHaveProperty('excerpt');
      expect(typeof result.excerpt).toBe('string');
      expect(result.excerpt.length).toBeGreaterThan(0);

      console.log('Generated excerpt:', result.excerpt);
    });

    it('should generate metadata for an article', async () => {
      if (!hasApiKey) return;

      const content = 'Cloud computing enables businesses to scale infrastructure on demand. This flexibility reduces costs and improves efficiency.';
      const title = 'Understanding Cloud Computing Benefits';

      const result = await AIService.generateMetadata(content, title);

      expect(result).toHaveProperty('seo');
      expect(result.seo).toHaveProperty('title');
      expect(result.seo).toHaveProperty('description');
      expect(result.seo).toHaveProperty('keywords');
      expect(result.seo).toHaveProperty('slug');
      expect(result).toHaveProperty('excerpt');

      console.log('Generated metadata:', JSON.stringify(result, null, 2));
    });

    it('should generate a newsletter subject', async () => {
      if (!hasApiKey) return;

      const content = 'This week we explore the latest trends in sustainable technology and green computing initiatives.';

      const result = await AIService.generateSubject(content);

      expect(result).toHaveProperty('subject');
      expect(typeof result.subject).toBe('string');
      expect(result.subject.length).toBeGreaterThan(0);

      console.log('Generated subject:', result.subject);
    });

    it('should generate preview text for email', async () => {
      if (!hasApiKey) return;

      const content = 'Discover how automation is changing the workplace. Learn about tools that can boost your productivity.';

      const result = await AIService.generatePreviewText(content);

      expect(result).toHaveProperty('previewText');
      expect(typeof result.previewText).toBe('string');

      console.log('Generated preview text:', result.previewText);
    });

    it('should generate post details with caption and tags', async () => {
      if (!hasApiKey) return;

      const prompt = 'Create a post about the benefits of remote work';
      const currentCaption = '';

      const result = await AIService.generatePostDetails(prompt, currentCaption);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('altText');
      expect(result).toHaveProperty('tags');
      expect(Array.isArray(result.tags)).toBe(true);

      // Tags should have # prefix
      if (result.tags.length > 0) {
        expect(result.tags[0]).toMatch(/^#/);
      }

      console.log('Generated post details:', JSON.stringify(result, null, 2));
    });
  });

  describe('Content Refinement', () => {
    it('should refine existing content based on instructions', async () => {
      if (!hasApiKey) return;

      const currentContent = 'AI is good for business.';
      const instruction = 'Make this more detailed and professional';
      const type = 'article' as const;

      const result = await AIService.refineContent(currentContent, instruction, type);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('chatResponse');
      expect(result.content.length).toBeGreaterThan(currentContent.length);

      console.log('Refined content:', result.content);
      console.log('Chat response:', result.chatResponse);
    });

    it('should generate article content from prompt', async () => {
      if (!hasApiKey) return;

      const prompt = 'Write a short paragraph about cybersecurity best practices';

      const result = await AIService.generateArticleContent(prompt);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);

      console.log('Generated article content:', result);
    });
  });

  describe('Article Metadata (Legacy)', () => {
    it('should generate comprehensive article metadata', async () => {
      if (!hasApiKey) return;

      const content = 'Digital transformation is reshaping industries worldwide. Companies must adapt to survive in this new landscape.';

      const result = await AIService.generateArticleMetadata(content);

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('slug');
      expect(Array.isArray(result.keywords)).toBe(true);

      console.log('Generated article metadata:', JSON.stringify(result, null, 2));
    });

    it('should generate article title (legacy method)', async () => {
      if (!hasApiKey) return;

      // Use substantial content to improve reliability
      const content = `Blockchain technology is revolutionizing industries far beyond cryptocurrency.
        From supply chain management to healthcare records, decentralized systems offer
        unprecedented transparency and security. Smart contracts automate complex agreements,
        while NFTs transform digital ownership. Enterprise adoption continues to accelerate
        as organizations discover new use cases for distributed ledger technology.
        Financial institutions are exploring blockchain for faster cross-border payments,
        while governments investigate its potential for secure voting systems and identity verification.`;

      // This test can occasionally fail due to model behavior - retry logic helps
      let result: string;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          result = await AIService.generateArticleTitle(content);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      expect(typeof result!).toBe('string');
      expect(result!.length).toBeGreaterThan(0);

      console.log('Generated article title (legacy):', result!);
    });
  });

  describe('Metadata Inference', () => {
    it('should infer metadata for article type', async () => {
      if (!hasApiKey) return;

      const content = `Data privacy regulations are evolving rapidly across the globe.
        From GDPR in Europe to CCPA in California, organizations must adapt to new compliance
        requirements. These regulations impact how companies collect, store, and process
        personal data, requiring significant investments in security infrastructure and
        privacy-by-design approaches.`;

      // Retry wrapper for flaky LLM behavior
      let result: any;
      for (let i = 0; i < 3; i++) {
        try {
          result = await AIService.inferMetadata(content, 'article');
          break;
        } catch (e) {
          if (i === 2) throw e;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('seo');

      console.log('Inferred article metadata:', JSON.stringify(result, null, 2));
    });

    it('should infer metadata for newsletter type', async () => {
      if (!hasApiKey) return;

      const content = `Welcome to our monthly tech digest newsletter!

        This edition covers the most significant technology trends shaping 2025. We explore
        groundbreaking advancements in artificial intelligence and machine learning that are
        transforming industries worldwide. The rise of quantum computing in enterprise applications
        is accelerating, with major breakthroughs in error correction and qubit stability.

        Sustainable technology continues to gain momentum, with green computing initiatives
        reducing data center carbon footprints by up to 40%. Remote work tools have evolved
        significantly, offering seamless collaboration features that rival in-person meetings.

        Featured this month:
        - AI-powered code assistants changing software development
        - Quantum supremacy milestones and practical applications
        - Green tech innovations in cloud infrastructure
        - Exclusive interviews with industry leaders
        - Practical tips for staying ahead in the digital age

        Don't miss our special section on cybersecurity threats and how to protect your organization.`;

      // Retry wrapper for flaky LLM behavior (more retries for composite operations)
      let result: any;
      for (let i = 0; i < 5; i++) {
        try {
          result = await AIService.inferMetadata(content, 'newsletter');
          break;
        } catch (e) {
          if (i === 4) throw e;
          await new Promise((r) => setTimeout(r, 3000)); // Longer delay for composite operations
        }
      }

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('previewText');

      console.log('Inferred newsletter metadata:', JSON.stringify(result, null, 2));
    });

    it('should infer metadata for post type', async () => {
      if (!hasApiKey) return;

      const content = 'Excited to share our latest project!';

      const result = await AIService.inferMetadata(content, 'post');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('tags');

      console.log('Inferred post metadata:', JSON.stringify(result, null, 2));
    });
  });
});
