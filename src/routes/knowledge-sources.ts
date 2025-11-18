import { Router } from 'express';
import { KnowledgeSourceController } from '../controllers/KnowledgeSourceController';
import { authenticateToken } from '../middleware/auth';
import { validateKnowledgeSource } from '../middleware/validation';
import { uploadSingle } from '../utils/fileUpload';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/knowledge-sources:
 *   get:
 *     summary: Get all knowledge sources
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of knowledge sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KnowledgeSource'
 *       500:
 *         description: Internal server error
 */
router.get('/', KnowledgeSourceController.getKnowledgeSources);

/**
 * @swagger
 * /api/knowledge-sources:
 *   post:
 *     summary: Create a new knowledge source
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateKnowledgeSourceRequest'
 *     responses:
 *       201:
 *         description: Knowledge source created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeSource'
 *       500:
 *         description: Internal server error
 */
router.post('/', validateKnowledgeSource, KnowledgeSourceController.createKnowledgeSource);

/**
 * @swagger
 * /api/knowledge-sources/{sourceId}:
 *   get:
 *     summary: Get knowledge source by ID
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Knowledge source ID
 *     responses:
 *       200:
 *         description: Knowledge source details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeSource'
 *       404:
 *         description: Knowledge source not found
 *       500:
 *         description: Internal server error
 */
router.get('/:sourceId', KnowledgeSourceController.getKnowledgeSourceById);

/**
 * @swagger
 * /api/knowledge-sources/{sourceId}:
 *   put:
 *     summary: Update a knowledge source
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Knowledge source ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateKnowledgeSourceRequest'
 *     responses:
 *       200:
 *         description: Knowledge source updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeSource'
 *       404:
 *         description: Knowledge source not found
 *       500:
 *         description: Internal server error
 */
router.put('/:sourceId', validateKnowledgeSource, KnowledgeSourceController.updateKnowledgeSource);

/**
 * @swagger
 * /api/knowledge-sources/{sourceId}/file:
 *   put:
 *     summary: Upload a file to a knowledge source
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Knowledge source ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Knowledge source updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnowledgeSource'
 *       404:
 *         description: Knowledge source not found
 *       500:
 *         description: Internal server error
 */
router.put('/:sourceId/file', authenticateToken, uploadSingle('file'), KnowledgeSourceController.uploadKnowledgeSourceFile);

/**
 * @swagger
 * /api/knowledge-sources/{sourceId}:
 *   delete:
 *     summary: Delete a knowledge source
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Knowledge source ID
 *     responses:
 *       204:
 *         description: Knowledge source deleted successfully
 *       404:
 *         description: Knowledge source not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:sourceId', KnowledgeSourceController.deleteKnowledgeSource);

/**
 * @swagger
 * /api/knowledge-sources/{sourceId}/reingest:
 *   post:
 *     summary: Reingest a knowledge source
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Knowledge source ID
 *     responses:
 *       200:
 *         description: Knowledge source reingestion started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reingestion started successfully
 *       404:
 *         description: Knowledge source not found
 *       500:
 *         description: Internal server error
 */
router.post('/:sourceId/reingest', KnowledgeSourceController.reingestKnowledgeSource);

export default router;
