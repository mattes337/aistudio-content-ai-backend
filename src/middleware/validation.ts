import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';

// Define credential schemas for different channel types
const websiteCredentialsSchema = Joi.object({
  username: Joi.string().optional(),
  password: Joi.string().optional(),
  apiKey: Joi.string().optional()
});

const instagramCredentialsSchema = Joi.object({
  accessToken: Joi.string().required(),
  userId: Joi.string().optional(),
  appId: Joi.string().optional(),
  appSecret: Joi.string().optional()
});

const facebookCredentialsSchema = Joi.object({
  accessToken: Joi.string().required(),
  pageId: Joi.string().optional(),
  appId: Joi.string().optional(),
  appSecret: Joi.string().optional()
});

const xCredentialsSchema = Joi.object({
  apiKey: Joi.string().required(),
  apiSecret: Joi.string().required(),
  accessToken: Joi.string().required(),
  accessTokenSecret: Joi.string().required(),
  bearerToken: Joi.string().optional()
});

const newsletterCredentialsSchema = Joi.object({
  smtpHost: Joi.string().required(),
  smtpPort: Joi.number().integer().min(1).max(65535).required(),
  smtpUser: Joi.string().required(),
  smtpPassword: Joi.string().required(),
  senderEmail: Joi.string().email().required(),
  apiKey: Joi.string().optional()
});

const channelSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().max(2048).required(),
  type: Joi.string().valid('website', 'instagram', 'facebook', 'x', 'newsletter').required(),
  platformApi: Joi.string().valid('none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api').required(),
  credentials: Joi.when('type', {
    is: 'website',
    then: websiteCredentialsSchema.optional(),
    otherwise: Joi.when('type', {
      is: 'instagram',
      then: instagramCredentialsSchema.required(),
      otherwise: Joi.when('type', {
        is: 'facebook',
        then: facebookCredentialsSchema.required(),
        otherwise: Joi.when('type', {
          is: 'x',
          then: xCredentialsSchema.required(),
          otherwise: Joi.when('type', {
            is: 'newsletter',
            then: newsletterCredentialsSchema.required(),
            otherwise: Joi.object().optional()
          })
        })
      })
    })
  }),
  data: Joi.object().optional()
});

const mediaAssetSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('instagram_post', 'article_feature', 'article_inline', 'icon').required(),
  file_path: Joi.string().required(),
  data: Joi.object().optional()
});

const articleSchema = Joi.object({
  title: Joi.string().min(1).required(),
  status: Joi.string().valid('draft', 'approved', 'scheduled', 'published', 'archived').optional(),
  publish_date: Joi.date().optional(),
  channel_id: Joi.string().uuid().required(),
  data: Joi.object().optional()
});

const postSchema = Joi.object({
  status: Joi.string().valid('draft', 'approved', 'scheduled', 'published', 'deleted').optional(),
  publish_date: Joi.date().optional(),
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
  publish_date: Joi.date().optional(),
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

// Lenient validation exports - logs unknown properties but accepts requests
export const validateChannelLenient = validateBodyLenient(channelSchema, ['name', 'url', 'type', 'platformApi', 'credentials', 'data']);
export const validateMediaAssetLenient = validateBodyLenient(mediaAssetSchema, ['title', 'type', 'file_path', 'data']);
export const validateArticleLenient = validateBodyLenient(articleSchema, ['title', 'status', 'publish_date', 'channel_id', 'data']);
export const validatePostLenient = validateBodyLenient(postSchema, ['status', 'publish_date', 'platform', 'linked_article_id', 'data']);
export const validateNewsletterLenient = validateBodyLenient(newsletterSchema, ['subject', 'status', 'publish_date', 'channel_id', 'data']);
export const validateKnowledgeSourceLenient = validateBodyLenient(knowledgeSourceSchema, ['name', 'type', 'source_origin', 'data']);
export const validateGenerateArticleLenient = validateBodyLenient(generateArticleSchema, ['prompt', 'currentContent']);
export const validateGenerateTitleLenient = validateBodyLenient(generateTitleSchema, ['content']);
export const validateGenerateMetadataLenient = validateBodyLenient(generateMetadataSchema, ['content']);
export const validateGeneratePostDetailsLenient = validateBodyLenient(generatePostDetailsSchema, ['prompt', 'currentCaption']);
export const validateGenerateImageLenient = validateBodyLenient(generateImageSchema, ['prompt', 'aspectRatio']);
export const validateEditImageLenient = validateBodyLenient(editImageSchema, ['prompt', 'base64ImageData', 'mimeType']);
export const validateGenerateBulkLenient = validateBodyLenient(generateBulkSchema, ['articleCount', 'postCount', 'knowledgeSummary']);
export const validateSearchKnowledgeLenient = validateBodyLenient(searchKnowledgeSchema, ['query', 'limit', 'threshold']);
