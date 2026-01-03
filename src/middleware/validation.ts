import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';

// =============================================================================
// Credential Schemas (per platform)
// =============================================================================

// WordPress credentials (platform_api: 'wordpress')
const wordpressCredentialsSchema = Joi.object({
  username: Joi.string().required(),
  applicationPassword: Joi.string().required()
});

// Instagram credentials (platform_api: 'instagram_graph')
const instagramCredentialsSchema = Joi.object({
  accessToken: Joi.string().required(),
  userId: Joi.string().required()
});

// Facebook credentials (platform_api: 'facebook_graph')
const facebookCredentialsSchema = Joi.object({
  accessToken: Joi.string().required(),
  pageId: Joi.string().required()
});

// X/Twitter credentials (platform_api: 'x_api')
const xCredentialsSchema = Joi.object({
  apiKey: Joi.string().required(),
  apiSecret: Joi.string().required(),
  accessToken: Joi.string().required(),
  accessTokenSecret: Joi.string().required(),
  bearerToken: Joi.string().optional()
});

// Email/Newsletter credentials (platform_api: 'email_api')
const emailCredentialsSchema = Joi.object({
  provider: Joi.string().valid('smtp', 'sendgrid', 'ses', 'mailgun', 'postmark').required(),
  // SMTP provider fields
  host: Joi.string().when('provider', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() }),
  port: Joi.number().integer().min(1).max(65535).when('provider', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() }),
  username: Joi.string().when('provider', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() }),
  password: Joi.string().when('provider', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() }),
  // API-based provider fields
  apiKey: Joi.string().when('provider', { is: 'smtp', then: Joi.optional(), otherwise: Joi.required() }),
  // Common fields
  fromEmail: Joi.string().email().required(),
  fromName: Joi.string().optional()
});

// =============================================================================
// Settings Schemas (per platform)
// =============================================================================

// WordPress proxy settings
const wordpressProxySettingsSchema = Joi.object({
  forwardedHost: Joi.string().required(),
  forwardedProto: Joi.string().valid('http', 'https').required()
});

// WordPress settings
const wordpressSettingsSchema = Joi.object({
  defaultStatus: Joi.string().valid('draft', 'pending', 'publish').optional(),
  defaultAuthor: Joi.number().integer().optional(),
  seoPlugin: Joi.string().valid('auto', 'yoast', 'rankmath', 'aioseo', 'seopress', 'surerank', 'none').optional(),
  proxy: wordpressProxySettingsSchema.optional()
});

// Instagram settings
const instagramSettingsSchema = Joi.object({
  defaultHashtags: Joi.array().items(Joi.string()).optional(),
  locationId: Joi.string().optional()
});

// Facebook settings
const facebookSettingsSchema = Joi.object({
  defaultAudience: Joi.string().valid('public', 'friends', 'only_me').optional()
});

// X/Twitter settings
const xSettingsSchema = Joi.object({
  defaultReplySettings: Joi.string().valid('everyone', 'following', 'mentionedUsers').optional()
});

// Email/Newsletter settings
const emailSettingsSchema = Joi.object({
  replyTo: Joi.string().email().optional(),
  template: Joi.string().optional()
});

// =============================================================================
// Channel Metadata Schema (AI hints)
// =============================================================================

const channelMetadataSchema = Joi.object({
  description: Joi.string().optional(),
  language: Joi.string().optional(),
  brandTone: Joi.string().optional(),
  targetAudience: Joi.string().optional(),
  contentGuidelines: Joi.string().optional()
});

// =============================================================================
// Channel Data Schema (combines credentials, settings, metadata)
// =============================================================================

// Helper to get credentials schema based on platform_api
const getCredentialsSchema = (platformApi: string) => {
  switch (platformApi) {
    case 'wordpress': return wordpressCredentialsSchema;
    case 'instagram_graph': return instagramCredentialsSchema;
    case 'facebook_graph': return facebookCredentialsSchema;
    case 'x_api': return xCredentialsSchema;
    case 'email_api': return emailCredentialsSchema;
    default: return Joi.object();
  }
};

// Helper to get settings schema based on platform_api
const getSettingsSchema = (platformApi: string) => {
  switch (platformApi) {
    case 'wordpress': return wordpressSettingsSchema;
    case 'instagram_graph': return instagramSettingsSchema;
    case 'facebook_graph': return facebookSettingsSchema;
    case 'x_api': return xSettingsSchema;
    case 'email_api': return emailSettingsSchema;
    default: return Joi.object();
  }
};

// Channel data schema with conditional validation
const channelDataSchema = Joi.object({
  credentials: Joi.object().optional(),
  settings: Joi.object().optional(),
  metadata: channelMetadataSchema.optional()
});

const channelSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().max(2048).required(),
  type: Joi.string().valid('website', 'instagram', 'facebook', 'x', 'newsletter').required(),
  platform_api: Joi.string().valid('none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api').required(),
  data: channelDataSchema.optional()
});

const mediaAssetSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('instagram_post', 'article_feature', 'article_inline', 'icon', 'generic_image').required(),
  file_path: Joi.string().required(),
  data: Joi.object().optional()
});

const articleSchema = Joi.object({
  title: Joi.string().min(1).required(),
  status: Joi.string().valid('draft', 'approved', 'scheduled', 'published', 'archived').optional(),
  publish_date: Joi.date().allow(null).optional(),
  channel_id: Joi.string().uuid().required(),
  data: Joi.object().optional()
});

const postSchema = Joi.object({
  status: Joi.string().valid('draft', 'approved', 'scheduled', 'published', 'deleted').optional(),
  publish_date: Joi.date().allow(null).optional(),
  platform: Joi.string().max(50).required(),
  linked_article_id: Joi.string().uuid().optional(),
  data: Joi.object().optional()
});

const knowledgeSourceSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('text', 'website', 'pdf', 'instagram', 'youtube', 'video_file', 'audio_file').required(),
  source_origin: Joi.string().required(),
  data: Joi.object().optional()
});

const generateArticleSchema = Joi.object({
  prompt: Joi.string().min(1).required(),
  currentContent: Joi.string().optional()
});

const generateTitleSchema = Joi.object({
  content: Joi.string().min(1).required()
});

const generateMetadataSchema = Joi.object({
  content: Joi.string().min(1).required()
});

const generatePostDetailsSchema = Joi.object({
  prompt: Joi.string().min(1).required(),
  currentCaption: Joi.string().optional()
});

const generateImageSchema = Joi.object({
  prompt: Joi.string().min(1).required(),
  aspectRatio: Joi.string().valid('1:1', '16:9', '9:16').optional()
});

const editImageSchema = Joi.object({
  prompt: Joi.string().min(1).required(),
  base64ImageData: Joi.string().min(1).required(),
  mimeType: Joi.string().required()
});

const newsletterSchema = Joi.object({
  subject: Joi.string().min(1).required(),
  status: Joi.string().valid('draft', 'scheduled', 'sent').optional(),
  publish_date: Joi.date().allow(null).optional(),
  channel_id: Joi.string().uuid().required(),
  data: Joi.object().optional()
});

const generateBulkSchema = Joi.object({
  articleCount: Joi.number().integer().min(1).required(),
  postCount: Joi.number().integer().min(1).required(),
  knowledgeSummary: Joi.string().min(1).required()
});

const searchKnowledgeSchema = Joi.object({
  query: Joi.string().min(1).required(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  threshold: Joi.number().min(0).max(1).optional()
});

const refineContentSchema = Joi.object({
  currentContent: Joi.string().optional().allow(''),
  instruction: Joi.string().min(1).required(),
  type: Joi.string().valid('article', 'post', 'newsletter').required(),
  history: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      text: Joi.string().required()
    })
  ).optional()
});

const researchQuerySchema = Joi.object({
  query: Joi.string().min(1).required(),
  channelId: Joi.string().uuid().optional(),
  history: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      text: Joi.string().required()
    })
  ).optional()
});

const agentTaskSchema = Joi.object({
  type: Joi.string().valid('create_article_draft', 'create_post_draft', 'create_media_draft').required(),
  params: Joi.object().optional()
});

const knowledgeSearchSchema = Joi.object({
  query: Joi.string().min(1).required(),
  type: Joi.string().valid('text', 'vector').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  minimum_score: Joi.number().min(0).max(1).optional()
});

const knowledgeAskSchema = Joi.object({
  question: Joi.string().min(1).required(),
  strategy_model: Joi.string().optional(),
  answer_model: Joi.string().optional(),
  final_answer_model: Joi.string().optional()
});

const inferMetadataSchema = Joi.object({
  content: Joi.string().min(1).required(),
  type: Joi.string().valid('article', 'post', 'newsletter').required()
});

// Lenient validation function - logs unknown properties and invalid optional values but accepts the request
function validateAndLog(
  data: any,
  allowedFields: string[],
  endpointName: string,
  schema?: Joi.ObjectSchema
): any {
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

  // If schema provided, validate optional fields and log warnings
  if (schema) {
    const { error } = schema.validate(validatedData, {
      allowUnknown: true,
      stripUnknown: false
    });

    if (error) {
      for (const detail of error.details) {
        const fieldName = detail.path.join('.');
        if (detail.type.includes('required')) {
          // Keep required field errors as they should cause 400
          throw new Error(`${fieldName} is required`);
        } else {
          // Log warnings for invalid optional fields
          validationWarnings.push(`${fieldName}: ${detail.message}`);
          logger.warn(`[${endpointName}] Invalid optional field:`, {
            field: fieldName,
            value: validatedData[fieldName],
            error: detail.message
          });
        }
      }
    }
  }

  // Custom validation: For email_api channels, validate credentials structure
  if (validatedData.platform_api === 'email_api' && validatedData.data?.credentials) {
    const creds = validatedData.data.credentials;
    if (!creds.provider) {
      throw new Error('data.credentials.provider is required for email_api channels');
    }
    if (!creds.fromEmail) {
      throw new Error('data.credentials.fromEmail is required for email_api channels');
    }
    if (creds.provider === 'smtp' && !creds.host) {
      throw new Error('data.credentials.host is required for SMTP provider');
    }
    if (creds.provider !== 'smtp' && !creds.apiKey) {
      throw new Error('data.credentials.apiKey is required for API-based email providers');
    }
  }

  return validatedData;
}

// Original strict validation middleware
export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Lenient validation middleware - logs but accepts requests with unknown properties
export const validateBodyLenient = (schema: Joi.ObjectSchema, allowedFields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const endpointName = `${req.method} ${req.route?.path || req.path}`;
      const validatedData = validateAndLog(req.body, allowedFields, endpointName, schema);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('is required')) {
        return res.status(400).json({
          message: 'Validation error',
          details: [error.message]
        });
      }
      // For other errors, log but continue
      logger.error(`Validation error in ${req.method} ${req.path}:`, error);
      next();
    }
  };
};

// Strict validation exports (original behavior)
export const validateChannel = validateBody(channelSchema);
export const validateMediaAsset = validateBody(mediaAssetSchema);
export const validateArticle = validateBody(articleSchema);
export const validatePost = validateBody(postSchema);
export const validateNewsletter = validateBody(newsletterSchema);
export const validateKnowledgeSource = validateBody(knowledgeSourceSchema);
export const validateGenerateArticle = validateBody(generateArticleSchema);
export const validateGenerateTitle = validateBody(generateTitleSchema);
export const validateGenerateMetadata = validateBody(generateMetadataSchema);
export const validateGeneratePostDetails = validateBody(generatePostDetailsSchema);
export const validateGenerateImage = validateBody(generateImageSchema);
export const validateEditImage = validateBody(editImageSchema);
export const validateGenerateBulk = validateBody(generateBulkSchema);
export const validateSearchKnowledge = validateBody(searchKnowledgeSchema);

// New AI validation exports
export const validateRefineContent = validateBody(refineContentSchema);
export const validateResearchQuery = validateBody(researchQuerySchema);
export const validateAgentTask = validateBody(agentTaskSchema);
export const validateKnowledgeSearch = validateBody(knowledgeSearchSchema);
export const validateKnowledgeAsk = validateBody(knowledgeAskSchema);
export const validateInferMetadata = validateBody(inferMetadataSchema);

// Lenient validation exports - logs unknown properties but accepts requests
export const validateChannelLenient = validateBodyLenient(channelSchema, ['name', 'url', 'type', 'platform_api', 'data']);
export const validateMediaAssetLenient = validateBodyLenient(mediaAssetSchema, ['title', 'type', 'file_path', 'data']);
export const validateArticleLenient = validateBodyLenient(articleSchema, ['title', 'status', 'publish_date', 'channel_id', 'data']);
export const validatePostLenient = validateBodyLenient(postSchema, ['status', 'publish_date', 'platform', 'linked_article_id', 'data']);
export const validateNewsletterLenient = validateBodyLenient(newsletterSchema, ['subject', 'status', 'publish_date', 'channel_id', 'data']);
export const validateKnowledgeSourceLenient = validateBodyLenient(knowledgeSourceSchema, ['name', 'type', 'source_origin', 'folder_path', 'data']);
export const validateGenerateArticleLenient = validateBodyLenient(generateArticleSchema, ['prompt', 'currentContent']);
export const validateGenerateTitleLenient = validateBodyLenient(generateTitleSchema, ['content']);
export const validateGenerateMetadataLenient = validateBodyLenient(generateMetadataSchema, ['content']);
export const validateGeneratePostDetailsLenient = validateBodyLenient(generatePostDetailsSchema, ['prompt', 'currentCaption']);
export const validateGenerateImageLenient = validateBodyLenient(generateImageSchema, ['prompt', 'aspectRatio']);
export const validateEditImageLenient = validateBodyLenient(editImageSchema, ['prompt', 'base64ImageData', 'mimeType']);
export const validateGenerateBulkLenient = validateBodyLenient(generateBulkSchema, ['articleCount', 'postCount', 'knowledgeSummary']);
export const validateSearchKnowledgeLenient = validateBodyLenient(searchKnowledgeSchema, ['query', 'limit', 'threshold']);

// Lenient versions for new AI endpoints
export const validateRefineContentLenient = validateBodyLenient(refineContentSchema, ['currentContent', 'instruction', 'type', 'history']);
export const validateResearchQueryLenient = validateBodyLenient(researchQuerySchema, ['query', 'channelId', 'history']);
export const validateAgentTaskLenient = validateBodyLenient(agentTaskSchema, ['type', 'params']);
export const validateKnowledgeSearchLenient = validateBodyLenient(knowledgeSearchSchema, ['query', 'type', 'limit', 'minimum_score']);
export const validateKnowledgeAskLenient = validateBodyLenient(knowledgeAskSchema, ['question', 'strategy_model', 'answer_model', 'final_answer_model']);
export const validateInferMetadataLenient = validateBodyLenient(inferMetadataSchema, ['content', 'type']);
