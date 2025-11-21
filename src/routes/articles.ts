import { Router } from 'express';
import { ArticleController } from '../controllers/ArticleController';
import { authenticateToken } from '../middleware/auth';
import { validateArticleLenient } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Get all articles
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 *       500:
 *         description: Internal server error
 */
router.get('/', ArticleController.getArticles);

/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateArticleRequest'
 *     responses:
 *       201:
 *         description: Article created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       500:
 *         description: Internal server error
 */
router.post('/', validateArticleLenient, ArticleController.createArticle);

/**
 * @swagger
 * /api/articles/{articleId}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */
router.get('/:articleId', ArticleController.getArticleById);

/**
 * @swagger
 * /api/articles/{articleId}:
 *   put:
 *     summary: Update an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateArticleRequest'
 *     responses:
 *       200:
 *         description: Article updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */
router.put('/:articleId', validateArticleLenient, ArticleController.updateArticle);

/**
 * @swagger
 * /api/articles/{articleId}:
 *   delete:
 *     summary: Delete an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     responses:
 *       204:
 *         description: Article deleted successfully
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:articleId', ArticleController.deleteArticle);

export default router;
