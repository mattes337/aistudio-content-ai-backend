import { Router } from 'express';
import { ChannelController } from '../controllers/ChannelController';
import { authenticateToken } from '../middleware/auth';
import { validateChannelLenient } from '../middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/channels:
 *   get:
 *     summary: Get all channels
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Channel'
 *       500:
 *         description: Internal server error
 */
router.get('/', ChannelController.getChannels);

/**
 * @swagger
 * /api/channels:
 *   post:
 *     summary: Create a new channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChannelRequest'
 *     responses:
 *       201:
 *         description: Channel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       500:
 *         description: Internal server error
 */
router.post('/', validateChannelLenient, ChannelController.createChannel);

/**
 * @swagger
 * /api/channels/{channelId}:
 *   get:
 *     summary: Get channel by ID
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Internal server error
 */
router.get('/:channelId', ChannelController.getChannelById);

/**
 * @swagger
 * /api/channels/{channelId}:
 *   put:
 *     summary: Update a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateChannelRequest'
 *     responses:
 *       200:
 *         description: Channel updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Internal server error
 */
router.put('/:channelId', validateChannelLenient, ChannelController.updateChannel);

/**
 * @swagger
 * /api/channels/{channelId}:
 *   delete:
 *     summary: Delete a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       204:
 *         description: Channel deleted successfully
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:channelId', ChannelController.deleteChannel);

export default router;
