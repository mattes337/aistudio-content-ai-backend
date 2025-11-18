import { Router } from 'express';
import { RecipientController } from '../controllers/RecipientController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/recipients:
 *   get:
 *     summary: Get all recipients
 *     tags: [Recipients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recipients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recipient'
 *       500:
 *         description: Internal server error
 */
router.get('/', RecipientController.getRecipients);

/**
 * @swagger
 * /api/recipients:
 *   post:
 *     summary: Create a new recipient
 *     tags: [Recipients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecipientRequest'
 *     responses:
 *       201:
 *         description: Recipient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipient'
 *       500:
 *         description: Internal server error
 */
router.post('/', RecipientController.createRecipient);

/**
 * @swagger
 * /api/recipients/{recipientId}:
 *   get:
 *     summary: Get recipient by ID
 *     tags: [Recipients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipient ID
 *     responses:
 *       200:
 *         description: Recipient details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipient'
 *       404:
 *         description: Recipient not found
 *       500:
 *         description: Internal server error
 */
router.get('/:recipientId', RecipientController.getRecipientById);

/**
 * @swagger
 * /api/recipients/{recipientId}:
 *   put:
 *     summary: Update a recipient
 *     tags: [Recipients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipient ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRecipientRequest'
 *     responses:
 *       200:
 *         description: Recipient updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipient'
 *       404:
 *         description: Recipient not found
 *       500:
 *         description: Internal server error
 */
router.put('/:recipientId', RecipientController.updateRecipient);

/**
 * @swagger
 * /api/recipients/{recipientId}:
 *   delete:
 *     summary: Delete a recipient
 *     tags: [Recipients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipient ID
 *     responses:
 *       204:
 *         description: Recipient deleted successfully
 *       404:
 *         description: Recipient not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:recipientId', RecipientController.deleteRecipient);

export default router;
