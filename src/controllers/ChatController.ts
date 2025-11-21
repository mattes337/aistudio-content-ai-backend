import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import {
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  CreateChatMessageRequest
} from '../models/Chat';
import logger from '../utils/logger';

// Helper function for lenient validation
function validateAndLog<T extends object>(
  data: any,
  allowedFields: string[],
  endpointName: string
): T {
  const validatedData: any = {};
  const unknownProperties: string[] = [];
  const validationWarnings: string[] = [];

  // Check for unknown properties
  for (const key in data) {
    if (allowedFields.includes(key)) {
      validatedData[key] = data[key];
    } else {
      unknownProperties.push(key);
    }
  }

  // Log unknown properties if any
  if (unknownProperties.length > 0) {
    logger.warn(`[${endpointName}] Unknown properties received:`, {
      unknownProperties,
      receivedData: data
    });
  }

  return validatedData as T;
}

export class ChatController {
  // Chat Session endpoints
  static async getChatSessions(req: Request, res: Response) {
    try {
      const sessions = await DatabaseService.getChatSessions();
      res.json(sessions);
    } catch (error) {
      logger.error('Error fetching chat sessions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getChatSessionById(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = await DatabaseService.getChatSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      
      res.json(session);
    } catch (error) {
      logger.error('Error fetching chat session:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createChatSession(req: Request, res: Response) {
    try {
      const allowedFields = ['title', 'channel_ids'];
      const sessionData = validateAndLog<CreateChatSessionRequest>(
        req.body,
        allowedFields,
        'createChatSession'
      );

      // Log warnings for invalid optional field values
      if (sessionData.channel_ids && !Array.isArray(sessionData.channel_ids)) {
        logger.warn('[createChatSession] Invalid channel_ids format - expected array:', {
          received: sessionData.channel_ids,
          type: typeof sessionData.channel_ids
        });
        // Accept it anyway but convert to empty array
        sessionData.channel_ids = [];
      }

      if (sessionData.title && typeof sessionData.title !== 'string') {
        logger.warn('[createChatSession] Invalid title format - expected string:', {
          received: sessionData.title,
          type: typeof sessionData.title
        });
        // Accept it anyway but convert to string
        sessionData.title = String(sessionData.title);
      }

      const session = await DatabaseService.createChatSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      logger.error('Error creating chat session:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateChatSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const allowedFields = ['title', 'channel_ids'];
      const bodyData = validateAndLog<Omit<UpdateChatSessionRequest, 'id'>>(
        req.body,
        allowedFields,
        'updateChatSession'
      );

      // Log warnings for invalid optional field values
      if (bodyData.channel_ids && !Array.isArray(bodyData.channel_ids)) {
        logger.warn('[updateChatSession] Invalid channel_ids format - expected array:', {
          received: bodyData.channel_ids,
          type: typeof bodyData.channel_ids
        });
        // Accept it anyway but convert to empty array
        bodyData.channel_ids = [];
      }

      if (bodyData.title && typeof bodyData.title !== 'string') {
        logger.warn('[updateChatSession] Invalid title format - expected string:', {
          received: bodyData.title,
          type: typeof bodyData.title
        });
        // Accept it anyway but convert to string
        bodyData.title = String(bodyData.title);
      }

      const sessionData: UpdateChatSessionRequest = { id: sessionId, ...bodyData };
      const session = await DatabaseService.updateChatSession(sessionData);

      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }

      res.json(session);
    } catch (error) {
      logger.error('Error updating chat session:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteChatSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const deleted = await DatabaseService.deleteChatSession(sessionId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting chat session:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Chat Message endpoints
  static async getChatMessages(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const messages = await DatabaseService.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      logger.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createChatMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const allowedFields = ['content', 'role'];
      const bodyData = validateAndLog<{
        content?: any;
        role?: any;
      }>(
        req.body,
        allowedFields,
        'createChatMessage'
      );

      let { content, role } = bodyData;

      // Validate required fields but be lenient with type conversion
      if (!content) {
        logger.warn('[createChatMessage] Missing content field:', { received: req.body });
        return res.status(400).json({
          message: 'Content is required.'
        });
      }

      if (!role) {
        logger.warn('[createChatMessage] Missing role field:', { received: req.body });
        return res.status(400).json({
          message: 'Role is required.'
        });
      }

      // Convert content to string if it's not already
      if (typeof content !== 'string') {
        logger.warn('[createChatMessage] Invalid content format - converting to string:', {
          received: content,
          type: typeof content
        });
        content = String(content);
      }

      // Handle role validation with lenient conversion
      if (typeof role !== 'string') {
        logger.warn('[createChatMessage] Invalid role format - converting to string:', {
          received: role,
          type: typeof role
        });
        role = String(role);
      }

      role = role.toLowerCase();
      if (!['user', 'assistant'].includes(role)) {
        logger.warn('[createChatMessage] Invalid role value - defaulting to "user":', {
          received: role
        });
        role = 'user'; // Default to 'user' instead of rejecting
      }

      const messageData: CreateChatMessageRequest = {
        session_id: sessionId,
        role: role as 'user' | 'assistant',
        content
      };

      const message = await DatabaseService.createChatMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      logger.error('Error creating chat message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Chat interaction endpoint
  static async chatWithSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const allowedFields = ['prompt'];
      const bodyData = validateAndLog<{
        prompt?: any;
      }>(
        req.body,
        allowedFields,
        'chatWithSession'
      );

      let { prompt } = bodyData;

      if (!prompt) {
        logger.warn('[chatWithSession] Missing prompt field:', { received: req.body });
        return res.status(400).json({
          message: 'Prompt is required.'
        });
      }

      // Convert prompt to string if it's not already
      if (typeof prompt !== 'string') {
        logger.warn('[chatWithSession] Invalid prompt format - converting to string:', {
          received: prompt,
          type: typeof prompt
        });
        prompt = String(prompt);
      }

      // First, save the user message
      await DatabaseService.createChatMessage({
        session_id: sessionId,
        role: 'user',
        content: prompt
      });

      // Get session context (associated channels)
      const session = await DatabaseService.getChatSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }

      // Generate context from channels (simplified - in real implementation would query knowledge sources)
      let context = '';
      if (session.channels && session.channels.length > 0) {
        context = `This question is related to your channels: ${session.channels.join(', ')}`;
      }

      // Generate simulated AI response
      const aiResponse = await DatabaseService.generateSimulatedResponse(prompt, context);

      // Save the AI response
      const assistantMessage = await DatabaseService.createChatMessage({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse
      });

      res.json({
        userMessage: prompt,
        assistantMessage: aiResponse,
        messageId: assistantMessage.id
      });
    } catch (error) {
      logger.error('Error in chat interaction:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Channel management for sessions
  static async addChannelsToSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const allowedFields = ['channel_ids'];
      const bodyData = validateAndLog<{
        channel_ids?: any;
      }>(
        req.body,
        allowedFields,
        'addChannelsToSession'
      );

      let { channel_ids } = bodyData;

      // Handle missing or invalid channel_ids
      if (!channel_ids) {
        logger.warn('[addChannelsToSession] Missing channel_ids field:', { received: req.body });
        channel_ids = []; // Default to empty array
      } else if (!Array.isArray(channel_ids)) {
        logger.warn('[addChannelsToSession] Invalid channel_ids format - converting to array:', {
          received: channel_ids,
          type: typeof channel_ids
        });
        // Try to convert to array if single value
        channel_ids = Array.isArray(channel_ids) ? channel_ids : [channel_ids];
      }

      await DatabaseService.addChannelsToSession(sessionId, channel_ids);
      res.status(200).json({ message: 'Channels added to session successfully' });
    } catch (error) {
      logger.error('Error adding channels to session:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async removeChannelsFromSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const allowedFields = ['channel_ids'];
      const bodyData = validateAndLog<{
        channel_ids?: any;
      }>(
        req.body,
        allowedFields,
        'removeChannelsFromSession'
      );

      let { channel_ids } = bodyData;

      // Handle missing or invalid channel_ids
      if (!channel_ids) {
        logger.warn('[removeChannelsFromSession] Missing channel_ids field:', { received: req.body });
        channel_ids = []; // Default to empty array
      } else if (!Array.isArray(channel_ids)) {
        logger.warn('[removeChannelsFromSession] Invalid channel_ids format - converting to array:', {
          received: channel_ids,
          type: typeof channel_ids
        });
        // Try to convert to array if single value
        channel_ids = Array.isArray(channel_ids) ? channel_ids : [channel_ids];
      }

      await DatabaseService.removeChannelsFromSession(sessionId, channel_ids);
      res.status(200).json({ message: 'Channels removed from session successfully' });
    } catch (error) {
      logger.error('Error removing channels from session:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getSessionChannels(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const channels = await DatabaseService.getSessionChannels(sessionId);
      res.json(channels);
    } catch (error) {
      logger.error('Error fetching session channels:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
