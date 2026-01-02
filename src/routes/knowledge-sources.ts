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
 *       - When no folder_path is provided (or empty string): returns all items (up to limit, default 100)
 *       - When folder_path is provided: returns only items directly in that folder (exclusive, not subfolders)
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder_path
 *         schema:
 *           type: string
 *         description: Filter by exact folder path (exclusive - only items directly in folder). Omit or use empty string to return all items.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name (case-insensitive partial match). Use with search_content=true to also search chunk content.
 *       - in: query
 *         name: search_content
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, also search in knowledge chunk content (not just name)
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
 * /api/knowledge-sources/transformations:
 *   get:
 *     summary: Get available transformations
 *     description: Returns list of transformation names that can be applied to sources via Open Notebook
 *     tags: [Knowledge Sources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available transformation names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transformations:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["dense-summary", "key-insights", "reflections"]
 *       500:
 *         description: Internal server error
 */
router.get('/transformations', KnowledgeSourceController.getAvailableTransformations);

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

/**
 * @swagger
 * /api/knowledge-sources/{sourceId}/logs:
 *   get:
 *     summary: Get processing logs for a knowledge source
 *     description: Returns paginated processing history including sync events, transformations, and errors
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of logs to skip for pagination
 *     responses:
 *       200:
 *         description: Paginated list of processing logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       knowledge_source_id:
 *                         type: string
 *                       event_type:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [info, warning, error, success]
 *                       message:
 *                         type: string
 *                       metadata:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       404:
 *         description: Knowledge source not found
 *       500:
 *         description: Internal server error
 */
router.get('/:sourceId/logs', KnowledgeSourceController.getKnowledgeSourceLogs);

export default router;
