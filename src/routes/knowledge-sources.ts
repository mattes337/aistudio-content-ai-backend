import { Router } from 'express';
import { KnowledgeSourceController } from '../controllers/KnowledgeSourceController';
import { authenticateToken } from '../middleware/auth';
import { validateKnowledgeSourceLenient } from '../middleware/validation';
import { uploadSingle } from '../utils/fileUpload';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/knowledge-sources:
 *   get:
 *     summary: Get knowledge sources with pagination, sorting, and filtering
 *     description: |
 *       Returns knowledge sources with pagination support.
 *       - When no folder_path is provided: returns all items (up to limit, default 100)
 *       - When folder_path is provided: returns only items directly in that folder (exclusive, not subfolders)
 *       - Use empty string for folder_path to get uncategorized items
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder_path
 *         schema:
 *           type: string
 *         description: Filter by exact folder path (exclusive - only items directly in folder). Use empty string for uncategorized items.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name (case-insensitive partial match)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [text, website, pdf, instagram, youtube, video_file, audio_file]
 *         description: Filter by knowledge source type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processed, error]
 *         description: Filter by processing status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, created_at, updated_at, type]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 100
 *         description: Maximum number of items to return (max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of items to skip for pagination
 *     responses:
 *       200:
 *         description: Paginated list of knowledge sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KnowledgeSource'
 *                 total:
 *                   type: integer
 *                   description: Total number of matching items
 *                 limit:
 *                   type: integer
 *                   description: Items per page
 *                 offset:
 *                   type: integer
 *                   description: Current offset
 *       500:
 *         description: Internal server error
 */
router.get('/', KnowledgeSourceController.getKnowledgeSources);

/**
 * @swagger
 * /api/knowledge-sources/folders:
 *   get:
 *     summary: Get folder tree structure
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Folder tree structure with item counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FolderTreeNode'
 *       500:
 *         description: Internal server error
 */
router.get('/folders', KnowledgeSourceController.getFolderTree);

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
router.post('/', validateKnowledgeSourceLenient, KnowledgeSourceController.createKnowledgeSource);

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
router.put('/:sourceId', validateKnowledgeSourceLenient, KnowledgeSourceController.updateKnowledgeSource);

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
