import { Router } from 'express';
import { AIController } from '../controllers/AIController';
import { authenticateToken } from '../middleware/auth';
import {
  validateGenerateArticleLenient,
  validateGenerateTitleLenient,
  validateGenerateMetadataLenient,
  validateGeneratePostDetailsLenient,
  validateGenerateImageLenient,
  validateEditImageLenient,
  validateGenerateBulkLenient,
  validateSearchKnowledgeLenient
} from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/ai/generate/article:
 *   post:
 *     summary: Generate a complete article
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Article generation prompt
 *               channel_id:
 *                 type: string
 *                 description: Target channel ID
 *               tone:
 *                 type: string
 *                 description: Writing tone (professional, casual, etc.)
 *               word_count:
 *                 type: number
 *                 description: Target word count
 *     responses:
 *       200:
 *         description: Article generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       500:
 *         description: Internal server error
 */
router.post('/generate/article', validateGenerateArticleLenient, AIController.generateArticle);

/**
 * @swagger
 * /api/ai/generate/article-title:
 *   post:
 *     summary: Generate article title
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Article content or summary
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Keywords to include in title
 *     responses:
 *       200:
 *         description: Title generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   description: Generated article title
 *       500:
 *         description: Internal server error
 */
router.post('/generate/article-title', validateGenerateTitleLenient, AIController.generateArticleTitle);

/**
 * @swagger
 * /api/ai/generate/article-metadata:
 *   post:
 *     summary: Generate article metadata (SEO, excerpt, tags)
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 description: Article title
 *               content:
 *                 type: string
 *                 description: Article content
 *     responses:
 *       200:
 *         description: Metadata generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SEO'
 *       500:
 *         description: Internal server error
 */
router.post('/generate/article-metadata', validateGenerateMetadataLenient, AIController.generateArticleMetadata);

/**
 * @swagger
 * /api/ai/generate/post-details:
 *   post:
 *     summary: Generate social media post details
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [article_id, platform]
 *             properties:
 *               article_id:
 *                 type: string
 *                 description: Source article ID
 *               platform:
 *                 type: string
 *                 enum: [instagram, twitter, facebook, linkedin]
 *                 description: Target platform
 *               post_type:
 *                 type: string
 *                 description: Post type (image, video, carousel, etc.)
 *     responses:
 *       200:
 *         description: Post details generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePostRequest'
 *       500:
 *         description: Internal server error
 */
router.post('/generate/post-details', validateGeneratePostDetailsLenient, AIController.generatePostDetails);

/**
 * @swagger
 * /api/ai/generate/image:
 *   post:
 *     summary: Generate an image
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Image generation prompt
 *               style:
 *                 type: string
 *                 description: Image style (photorealistic, cartoon, etc.)
 *               size:
 *                 type: string
 *                 enum: [256x256, 512x512, 1024x1024]
 *                 description: Image size
 *     responses:
 *       200:
 *         description: Image generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image_url:
 *                   type: string
 *                   description: URL of generated image
 *                 image_id:
 *                   type: string
 *                   description: Generated image ID
 *       500:
 *         description: Internal server error
 */
router.post('/generate/image', validateGenerateImageLenient, AIController.generateImage);

/**
 * @swagger
 * /api/ai/edit/image:
 *   post:
 *     summary: Edit an existing image
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image_url, prompt]
 *             properties:
 *               image_url:
 *                 type: string
 *                 description: URL of image to edit
 *               prompt:
 *                 type: string
 *                 description: Edit instruction
 *               mask_url:
 *                 type: string
 *                 description: Mask URL for selective editing
 *     responses:
 *       200:
 *         description: Image edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image_url:
 *                   type: string
 *                   description: URL of edited image
 *                 image_id:
 *                   type: string
 *                   description: Edited image ID
 *       500:
 *         description: Internal server error
 */
router.post('/edit/image', validateEditImageLenient, AIController.editImage);

/**
 * @swagger
 * /api/ai/generate/bulk:
 *   post:
 *     summary: Generate bulk content (articles, posts, images)
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requests]
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [article, post, image]
 *                     parameters:
 *                       type: object
 *                       description: Generation parameters for the type
 *                 description: Array of generation requests
 *     responses:
 *       200:
 *         description: Bulk content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       result:
 *                         type: object
 *                       success:
 *                         type: boolean
 *                   description: Generation results
 *       500:
 *         description: Internal server error
 */
router.post('/generate/bulk', validateGenerateBulkLenient, AIController.generateBulk);

/**
 * @swagger
 * /api/ai/search/knowledge:
 *   post:
 *     summary: Search knowledge base
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               limit:
 *                 type: number
 *                 default: 10
 *                 description: Maximum number of results
 *               source_type:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Filter by knowledge source types
 *     responses:
 *       200:
 *         description: Knowledge search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       content:
 *                         type: string
 *                       source:
 *                         type: string
 *                       relevance_score:
 *                         type: number
 *                   description: Search results
 *       500:
 *         description: Internal server error
 */
router.post('/search/knowledge', validateSearchKnowledgeLenient, AIController.searchKnowledge);

export default router;
