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

// ============== New Gemini Endpoints ==============

/**
 * @swagger
 * /api/ai/refine-content:
 *   post:
 *     summary: Refine content with AI assistance (chat-based)
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instruction, type]
 *             properties:
 *               currentContent:
 *                 type: string
 *                 description: Current content to refine
 *               instruction:
 *                 type: string
 *                 description: User instruction for refinement
 *               type:
 *                 type: string
 *                 enum: [article, post, newsletter]
 *                 description: Content type
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     text:
 *                       type: string
 *                 description: Chat history for context
 *     responses:
 *       200:
 *         description: Content refined successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                 chatResponse:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/refine-content', AIController.refineContent);

/**
 * @swagger
 * /api/ai/refine-content/stream:
 *   post:
 *     summary: Refine content with AI assistance (streaming SSE response)
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instruction, type]
 *             properties:
 *               currentContent:
 *                 type: string
 *                 description: Current content to refine
 *               instruction:
 *                 type: string
 *                 description: User instruction for refinement
 *               type:
 *                 type: string
 *                 enum: [article, post, newsletter]
 *                 description: Content type
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     text:
 *                       type: string
 *                 description: Chat history for context
 *     responses:
 *       200:
 *         description: Content refined successfully (SSE stream)
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error
 */
router.post('/refine-content/stream', AIController.refineContentStream);

/**
 * @swagger
 * /api/ai/generate/title:
 *   post:
 *     summary: Generate a title from content
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
 *                 description: Content to generate title from
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
 *       500:
 *         description: Internal server error
 */
router.post('/generate/title', AIController.generateTitle);

/**
 * @swagger
 * /api/ai/generate/subject:
 *   post:
 *     summary: Generate a newsletter subject line
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
 *                 description: Newsletter content
 *     responses:
 *       200:
 *         description: Subject generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subject:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/generate/subject', AIController.generateSubject);

/**
 * @swagger
 * /api/ai/generate/metadata:
 *   post:
 *     summary: Generate SEO metadata and excerpt
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, title]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Article content
 *               title:
 *                 type: string
 *                 description: Article title
 *     responses:
 *       200:
 *         description: Metadata generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seo:
 *                   $ref: '#/components/schemas/SEO'
 *                 excerpt:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/generate/metadata', AIController.generateMetadata);

/**
 * @swagger
 * /api/ai/generate/excerpt:
 *   post:
 *     summary: Generate an excerpt from content
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
 *                 description: Content to summarize
 *     responses:
 *       200:
 *         description: Excerpt generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 excerpt:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/generate/excerpt', AIController.generateExcerpt);

/**
 * @swagger
 * /api/ai/generate/preview-text:
 *   post:
 *     summary: Generate preview text for newsletter
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
 *                 description: Newsletter content
 *     responses:
 *       200:
 *         description: Preview text generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 previewText:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/generate/preview-text', AIController.generatePreviewText);

/**
 * @swagger
 * /api/ai/generate/post-details-v2:
 *   post:
 *     summary: Generate post details (content, altText, tags) using new Gemini SDK
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
 *                 description: Prompt for post generation
 *               currentCaption:
 *                 type: string
 *                 description: Current caption for context
 *     responses:
 *       200:
 *         description: Post details generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                 altText:
 *                   type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.post('/generate/post-details-v2', AIController.generatePostDetailsNew);

/**
 * @swagger
 * /api/ai/generate/image-v2:
 *   post:
 *     summary: Generate an image using new Gemini SDK
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
 *               aspectRatio:
 *                 type: string
 *                 enum: ['1:1', '16:9', '9:16']
 *                 default: '1:1'
 *                 description: Target aspect ratio
 *     responses:
 *       200:
 *         description: Image generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageUrl:
 *                   type: string
 *                 base64Image:
 *                   type: string
 *                 mimeType:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/generate/image-v2', AIController.generateImageNew);

/**
 * @swagger
 * /api/ai/edit/image-v2:
 *   post:
 *     summary: Edit an image using new Gemini SDK
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [base64ImageData, mimeType, prompt]
 *             properties:
 *               base64ImageData:
 *                 type: string
 *                 description: Base64-encoded image data
 *               mimeType:
 *                 type: string
 *                 description: Image MIME type
 *               prompt:
 *                 type: string
 *                 description: Edit instruction
 *     responses:
 *       200:
 *         description: Image edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageUrl:
 *                   type: string
 *                 base64Image:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/edit/image-v2', AIController.editImageNew);

/**
 * @swagger
 * /api/ai/infer-metadata:
 *   post:
 *     summary: Infer metadata based on content type
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, type]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Content to analyze
 *               type:
 *                 type: string
 *                 enum: [article, post, newsletter]
 *                 description: Content type
 *     responses:
 *       200:
 *         description: Metadata inferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error
 */
router.post('/infer-metadata', AIController.inferMetadata);

/**
 * @swagger
 * /api/ai/metadata:
 *   post:
 *     summary: Generate specific metadata based on requested operations
 *     description: |
 *       Unified metadata generation endpoint. Caller specifies which metadata
 *       operations to perform. All requested operations run in parallel.
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operations, content, contentType]
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [title, subject, seoMetadata, excerpt, previewText, postDetails]
 *                 description: Which metadata operations to perform
 *                 example: ["title", "excerpt", "seoMetadata"]
 *               content:
 *                 type: string
 *                 description: Content to generate metadata from
 *               contentType:
 *                 type: string
 *                 enum: [article, post, newsletter]
 *                 description: Type of content
 *               title:
 *                 type: string
 *                 description: Required when requesting seoMetadata
 *               prompt:
 *                 type: string
 *                 description: Prompt for postDetails operation
 *               currentCaption:
 *                 type: string
 *                 description: Current caption context for postDetails
 *     responses:
 *       200:
 *         description: Metadata generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                 subject:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                 seoMetadata:
 *                   type: object
 *                   properties:
 *                     seo:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         keywords:
 *                           type: string
 *                         slug:
 *                           type: string
 *                     excerpt:
 *                       type: string
 *                 excerpt:
 *                   type: object
 *                   properties:
 *                     excerpt:
 *                       type: string
 *                 previewText:
 *                   type: object
 *                   properties:
 *                     previewText:
 *                       type: string
 *                 postDetails:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                     altText:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/metadata', AIController.generateMetadataByOperations);

// ============== Claude Agent Endpoints ==============

/**
 * @swagger
 * /api/ai/research:
 *   post:
 *     summary: Research query using Claude Agent with RAG
 *     tags: [AI Research]
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
 *                 description: Research query
 *               channelId:
 *                 type: string
 *                 description: Optional channel ID for context filtering
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     text:
 *                       type: string
 *                 description: Conversation history
 *     responses:
 *       200:
 *         description: Research completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       content:
 *                         type: string
 *                 toolCalls:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.post('/research', AIController.researchQuery);

/**
 * @swagger
 * /api/ai/research/stream:
 *   post:
 *     summary: Research query with streaming response (SSE)
 *     tags: [AI Research]
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
 *                 description: Research query
 *               channelId:
 *                 type: string
 *                 description: Optional channel ID for context filtering
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     text:
 *                       type: string
 *                 description: Conversation history
 *               verbose:
 *                 type: boolean
 *                 default: false
 *                 description: Include detailed tool calls and intermediate results in stream
 *     responses:
 *       200:
 *         description: Streaming research response (SSE)
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [status, tool_start, tool_result, delta, sources, done, error]
 *                 status:
 *                   type: string
 *                 tool:
 *                   type: string
 *                 toolInput:
 *                   type: object
 *                 toolResult:
 *                   type: object
 *                 content:
 *                   type: string
 *                 sources:
 *                   type: array
 *                 response:
 *                   type: string
 *                 steps:
 *                   type: number
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/research/stream', AIController.researchQueryStream);

/**
 * @swagger
 * /api/ai/agent/task:
 *   post:
 *     summary: Execute a content creation task via Claude Agent
 *     tags: [AI Research]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [create_article_draft, create_post_draft, create_media_draft]
 *                 description: Task type
 *               params:
 *                 type: object
 *                 description: Task parameters (title, topic, platform, etc.)
 *     responses:
 *       200:
 *         description: Task executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 result:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/agent/task', AIController.executeAgentTask);

// ============== Open Notebook RAG Endpoints ==============

/**
 * @swagger
 * /api/ai/knowledge/search:
 *   post:
 *     summary: Search the Open Notebook knowledge base
 *     tags: [Knowledge Base]
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
 *               type:
 *                 type: string
 *                 enum: [text, vector]
 *                 default: vector
 *                 description: Search type
 *               limit:
 *                 type: number
 *                 default: 10
 *                 description: Maximum results
 *               minimum_score:
 *                 type: number
 *                 default: 0.2
 *                 description: Minimum relevance score (0-1)
 *     responses:
 *       200:
 *         description: Search completed successfully
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
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       source_name:
 *                         type: string
 *                       score:
 *                         type: number
 *                 total_count:
 *                   type: number
 *                 search_type:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/knowledge/search', AIController.searchKnowledgeBase);

/**
 * @swagger
 * /api/ai/knowledge/ask:
 *   post:
 *     summary: Ask a question to the Open Notebook knowledge base
 *     tags: [Knowledge Base]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question:
 *                 type: string
 *                 description: Question to ask
 *               strategy_model:
 *                 type: string
 *                 description: Model ID for strategy
 *               answer_model:
 *                 type: string
 *                 description: Model ID for answering
 *               final_answer_model:
 *                 type: string
 *                 description: Model ID for final synthesis
 *     responses:
 *       200:
 *         description: Answer generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                 question:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/knowledge/ask', AIController.askKnowledgeBase);

/**
 * @swagger
 * /api/ai/health:
 *   get:
 *     summary: Check AI services health
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 services:
 *                   type: object
 *                   properties:
 *                     gemini:
 *                       type: boolean
 *                     open_notebook:
 *                       type: boolean
 *       500:
 *         description: Internal server error
 */
router.get('/health', AIController.healthCheck);

export default router;
