import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';

const router = Router();

/**
 * @swagger
 * /api/chat/sessions:
 *   get:
 *     summary: Get all chat sessions
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chat sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatSession'
 *       500:
 *         description: Internal server error
 */
router.get('/sessions', ChatController.getChatSessions);

/**
 * @swagger
 * /api/chat/sessions:
 *   post:
 *     summary: Create a new chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title for the chat session
 *               channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of channel IDs to associate with this session
 *     responses:
 *       201:
 *         description: Chat session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatSession'
 *       500:
 *         description: Internal server error
 */
router.post('/sessions', ChatController.createChatSession);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}:
 *   get:
 *     summary: Get a chat session by ID with messages and channels
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     responses:
 *       200:
 *         description: Chat session with messages and channels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatSessionWithMessages'
 *       404:
 *         description: Chat session not found
 *       500:
 *         description: Internal server error
 */
router.get('/sessions/:sessionId', ChatController.getChatSessionById);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}:
 *   put:
 *     summary: Update a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title for the chat session
 *               channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of channel IDs to associate with this session
 *     responses:
 *       200:
 *         description: Chat session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatSession'
 *       404:
 *         description: Chat session not found
 *       500:
 *         description: Internal server error
 */
router.put('/sessions/:sessionId', ChatController.updateChatSession);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     responses:
 *       204:
 *         description: Chat session deleted successfully
 *       404:
 *         description: Chat session not found
 *       500:
 *         description: Internal server error
 */
router.delete('/sessions/:sessionId', ChatController.deleteChatSession);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}/messages:
 *   get:
 *     summary: Get all messages in a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     responses:
 *       200:
 *         description: List of chat messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
 *       500:
 *         description: Internal server error
 */
router.get('/sessions/:sessionId/messages', ChatController.getChatMessages);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}/messages:
 *   post:
 *     summary: Add a new message to a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - content
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, assistant]
 *                 description: Message role
 *               content:
 *                 type: string
 *                 description: Message content
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatMessage'
 *       400:
 *         description: Invalid message data
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/:sessionId/messages', ChatController.createChatMessage);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}/chat:
 *   post:
 *     summary: Send a message and get AI response in a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: User's message/prompt
 *     responses:
 *       200:
 *         description: Chat interaction completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userMessage:
 *                   type: string
 *                 assistantMessage:
 *                   type: string
 *                 messageId:
 *                   type: string
 *       400:
 *         description: Prompt is required
 *       404:
 *         description: Chat session not found
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/:sessionId/chat', ChatController.chatWithSession);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}/channels:
 *   post:
 *     summary: Add channels to a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel_ids
 *             properties:
 *               channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of channel IDs to add
 *     responses:
 *       200:
 *         description: Channels added successfully
 *       400:
 *         description: Invalid channel IDs
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/:sessionId/channels', ChatController.addChannelsToSession);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}/channels:
 *   delete:
 *     summary: Remove channels from a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel_ids
 *             properties:
 *               channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of channel IDs to remove
 *     responses:
 *       200:
 *         description: Channels removed successfully
 *       400:
 *         description: Invalid channel IDs
 *       500:
 *         description: Internal server error
 */
router.delete('/sessions/:sessionId/channels', ChatController.removeChannelsFromSession);

/**
 * @swagger
 * /api/chat/sessions/{sessionId}/channels:
 *   get:
 *     summary: Get channels associated with a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     responses:
 *       200:
 *         description: List of channel IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error
 */
router.get('/sessions/:sessionId/channels', ChatController.getSessionChannels);

export default router;
