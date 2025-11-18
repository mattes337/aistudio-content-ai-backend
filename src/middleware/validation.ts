import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const channelSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().max(2048).required(),
  type: Joi.string().valid('website', 'instagram', 'facebook', 'x', 'newsletter').required(),
  platformApi: Joi.string().valid('none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api').required(),
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
