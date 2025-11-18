import swaggerJsdoc from 'swagger-jsdoc';
import { loadEnvConfig } from '../utils/env';

const config = loadEnvConfig();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Content AI Backend API',
      version: '1.0.0',
      description: 'RESTful API for Content AI Backend application',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: config.nodeEnv === 'production' 
          ? 'https://your-domain.com' 
          : '{request.baseUrl}', // Will be replaced by dynamic detection
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Bearer'
        }
      },
      schemas: {
        Channel: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Channel unique identifier'
            },
            name: {
              type: 'string',
              description: 'Channel name',
              maxLength: 255
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Channel URL',
              maxLength: 2048
            },
            type: {
              type: 'string',
              enum: ['website', 'instagram', 'facebook', 'x', 'newsletter'],
              description: 'Channel type'
            },
            platform_api: {
              type: 'string',
              enum: ['none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api'],
              description: 'Platform API type'
            },
            credentials: {
              type: 'object',
              description: 'Platform API credentials'
            },
            metadata: {
              type: 'object',
              description: 'Additional channel metadata'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Channel creation date'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Channel last update date'
            }
          }
        },
        CreateChannelRequest: {
          type: 'object',
          required: ['name', 'url', 'type', 'platformApi'],
          properties: {
            name: {
              type: 'string',
              description: 'Channel name',
              minLength: 1,
              maxLength: 255
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Channel URL',
              maxLength: 2048
            },
            type: {
              type: 'string',
              enum: ['website', 'instagram', 'facebook', 'x', 'newsletter'],
              description: 'Channel type'
            },
            platformApi: {
              type: 'string',
              enum: ['none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api'],
              description: 'Platform API type'
            },
            credentials: {
              type: 'object',
              description: 'Platform API credentials'
            },
            metadata: {
              type: 'object',
              description: 'Additional channel metadata'
            }
          }
        },
        UpdateChannelRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Channel name',
              minLength: 1,
              maxLength: 255
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Channel URL',
              maxLength: 2048
            },
            type: {
              type: 'string',
              enum: ['website', 'instagram', 'facebook', 'x', 'newsletter'],
              description: 'Channel type'
            },
            platformApi: {
              type: 'string',
              enum: ['none', 'wordpress', 'instagram_graph', 'facebook_graph', 'x_api', 'email_api'],
              description: 'Platform API type'
            },
            credentials: {
              type: 'object',
              description: 'Platform API credentials'
            },
            metadata: {
              type: 'object',
              description: 'Additional channel metadata'
            }
          }
        },
        MediaAsset: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Media asset unique identifier'
            },
            title: {
              type: 'string',
              description: 'Media asset title'
            },
            description: {
              type: 'string',
              description: 'Media asset description'
            },
            image_url: {
              type: 'string',
              description: 'URL of the media asset image'
            },
            type: {
              type: 'string',
              enum: ['instagram_post', 'article_feature', 'article_inline', 'icon'],
              description: 'Media asset type'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Media asset creation date'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Media asset last update date'
            }
          }
        },
        CreateMediaAssetRequest: {
          type: 'object',
          required: ['title', 'image_url', 'type'],
          properties: {
            title: {
              type: 'string',
              description: 'Media asset title',
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              description: 'Media asset description',
              maxLength: 1000
            },
            image_url: {
              type: 'string',
              description: 'URL of the media asset image'
            },
            type: {
              type: 'string',
              enum: ['instagram_post', 'article_feature', 'article_inline', 'icon'],
              description: 'Media asset type'
            }
          }
        },
        UpdateMediaAssetRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Media asset title',
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              description: 'Media asset description',
              maxLength: 1000
            },
            image_url: {
              type: 'string',
              description: 'URL of the media asset image'
            },
            type: {
              type: 'string',
              enum: ['instagram_post', 'article_feature', 'article_inline', 'icon'],
              description: 'Media asset type'
            }
          }
        },
        Article: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Article unique identifier'
            },
            title: {
              type: 'string',
              description: 'Article title'
            },
            content: {
              type: 'string',
              description: 'Article content'
            },
            title_image_url: {
              type: 'string',
              description: 'URL of the title image'
            },
            title_image_alt: {
              type: 'string',
              description: 'Alt text for the title image'
            },
            inline_images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InlineImage'
              },
              description: 'Inline images in the article'
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'scheduled', 'published', 'archived'],
              description: 'Article status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Article publish date'
            },
            author: {
              type: 'string',
              description: 'Article author'
            },
            excerpt: {
              type: 'string',
              description: 'Article excerpt'
            },
            categories: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Article categories'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Article tags'
            },
            seo: {
              $ref: '#/components/schemas/SEO'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Article creation date'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Article last update date'
            }
          }
        },
        InlineImage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Inline image ID'
            },
            url: {
              type: 'string',
              description: 'Inline image URL'
            },
            alt: {
              type: 'string',
              description: 'Alt text for the inline image'
            }
          }
        },
        SEO: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'SEO title'
            },
            description: {
              type: 'string',
              description: 'SEO description'
            },
            keywords: {
              type: 'string',
              description: 'SEO keywords'
            },
            slug: {
              type: 'string',
              description: 'SEO slug'
            }
          }
        },
        CreateArticleRequest: {
          type: 'object',
          required: ['title', 'content', 'status', 'channel_id'],
          properties: {
            title: {
              type: 'string',
              description: 'Article title'
            },
            content: {
              type: 'string',
              description: 'Article content'
            },
            title_image_url: {
              type: 'string',
              description: 'URL of the title image'
            },
            title_image_alt: {
              type: 'string',
              description: 'Alt text for the title image'
            },
            inline_images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InlineImage'
              },
              description: 'Inline images in the article'
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'scheduled', 'published', 'archived'],
              description: 'Article status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Article publish date'
            },
            author: {
              type: 'string',
              description: 'Article author'
            },
            excerpt: {
              type: 'string',
              description: 'Article excerpt'
            },
            categories: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Article categories'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Article tags'
            },
            seo: {
              $ref: '#/components/schemas/SEO'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID'
            }
          }
        },
        UpdateArticleRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Article title'
            },
            content: {
              type: 'string',
              description: 'Article content'
            },
            title_image_url: {
              type: 'string',
              description: 'URL of the title image'
            },
            title_image_alt: {
              type: 'string',
              description: 'Alt text for the title image'
            },
            inline_images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InlineImage'
              },
              description: 'Inline images in the article'
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'scheduled', 'published', 'archived'],
              description: 'Article status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Article publish date'
            },
            author: {
              type: 'string',
              description: 'Article author'
            },
            excerpt: {
              type: 'string',
              description: 'Article excerpt'
            },
            categories: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Article categories'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Article tags'
            },
            seo: {
              $ref: '#/components/schemas/SEO'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID'
            }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Post unique identifier'
            },
            content: {
              type: 'string',
              description: 'Post content'
            },
            background_image_url: {
              type: 'string',
              description: 'URL of the background image'
            },
            base_background_image_url: {
              type: 'string',
              description: 'URL of the base background image'
            },
            overlays: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Overlay'
              },
              description: 'Post overlays'
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'scheduled', 'published', 'deleted'],
              description: 'Post status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Post publish date'
            },
            platform: {
              type: 'string',
              description: 'Post platform'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Post tags'
            },
            location: {
              type: 'string',
              description: 'Post location'
            },
            tagged_users: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tagged users'
            },
            alt_text: {
              type: 'string',
              description: 'Alt text for the post'
            },
            disable_comments: {
              type: 'boolean',
              description: 'Whether comments are disabled'
            },
            hide_likes: {
              type: 'boolean',
              description: 'Whether likes are hidden'
            },
            linked_article_id: {
              type: 'string',
              description: 'Linked article ID'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Post creation date'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Post last update date'
            }
          }
        },
        Overlay: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Overlay ID'
            },
            type: {
              type: 'string',
              description: 'Overlay type'
            },
            x: {
              type: 'number',
              description: 'X position'
            },
            y: {
              type: 'number',
              description: 'Y position'
            },
            width: {
              type: 'number',
              description: 'Overlay width'
            },
            height: {
              type: 'number',
              description: 'Overlay height'
            }
          }
        },
        CreatePostRequest: {
          type: 'object',
          required: ['content', 'background_image_url', 'status', 'platform'],
          properties: {
            content: {
              type: 'string',
              description: 'Post content'
            },
            background_image_url: {
              type: 'string',
              description: 'URL of the background image'
            },
            base_background_image_url: {
              type: 'string',
              description: 'URL of the base background image'
            },
            overlays: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Overlay'
              },
              description: 'Post overlays'
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'scheduled', 'published', 'deleted'],
              description: 'Post status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Post publish date'
            },
            platform: {
              type: 'string',
              description: 'Post platform'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Post tags'
            },
            location: {
              type: 'string',
              description: 'Post location'
            },
            tagged_users: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tagged users'
            },
            alt_text: {
              type: 'string',
              description: 'Alt text for the post'
            },
            disable_comments: {
              type: 'boolean',
              description: 'Whether comments are disabled'
            },
            hide_likes: {
              type: 'boolean',
              description: 'Whether likes are hidden'
            },
            linked_article_id: {
              type: 'string',
              description: 'Linked article ID'
            }
          }
        },
        UpdatePostRequest: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Post content'
            },
            background_image_url: {
              type: 'string',
              description: 'URL of the background image'
            },
            base_background_image_url: {
              type: 'string',
              description: 'URL of the base background image'
            },
            overlays: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Overlay'
              },
              description: 'Post overlays'
            },
            status: {
              type: 'string',
              enum: ['draft', 'approved', 'scheduled', 'published', 'deleted'],
              description: 'Post status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Post publish date'
            },
            platform: {
              type: 'string',
              description: 'Post platform'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Post tags'
            },
            location: {
              type: 'string',
              description: 'Post location'
            },
            tagged_users: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tagged users'
            },
            alt_text: {
              type: 'string',
              description: 'Alt text for the post'
            },
            disable_comments: {
              type: 'boolean',
              description: 'Whether comments are disabled'
            },
            hide_likes: {
              type: 'boolean',
              description: 'Whether likes are hidden'
            },
            linked_article_id: {
              type: 'string',
              description: 'Linked article ID'
            }
          }
        },
        KnowledgeSource: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge source unique identifier'
            },
            name: {
              type: 'string',
              description: 'Knowledge source name'
            },
            type: {
              type: 'string',
              enum: ['text', 'website', 'pdf', 'instagram', 'youtube', 'video_file', 'audio_file'],
              description: 'Knowledge source type'
            },
            source: {
              type: 'string',
              description: 'Knowledge source content or URL'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processed', 'error'],
              description: 'Processing status'
            },
            ingested_content: {
              type: 'string',
              description: 'Ingested content'
            },
            ingestion_log: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/IngestionLogEntry'
              },
              description: 'Ingestion log entries'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Knowledge source creation date'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Knowledge source last update date'
            }
          }
        },
        IngestionLogEntry: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Log entry timestamp'
            },
            message: {
              type: 'string',
              description: 'Log message'
            },
            level: {
              type: 'string',
              enum: ['info', 'warn', 'error'],
              description: 'Log level'
            }
          }
        },
        CreateKnowledgeSourceRequest: {
          type: 'object',
          required: ['name', 'type', 'source'],
          properties: {
            name: {
              type: 'string',
              description: 'Knowledge source name'
            },
            type: {
              type: 'string',
              enum: ['text', 'website', 'pdf', 'instagram', 'youtube', 'video_file', 'audio_file'],
              description: 'Knowledge source type'
            },
            source: {
              type: 'string',
              description: 'Knowledge source content or URL'
            }
          }
        },
        UpdateKnowledgeSourceRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Knowledge source name'
            },
            type: {
              type: 'string',
              enum: ['text', 'website', 'pdf', 'instagram', 'youtube', 'video_file', 'audio_file'],
              description: 'Knowledge source type'
            },
            source: {
              type: 'string',
              description: 'Knowledge source content or URL'
            }
          }
        },
        Recipient: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Recipient unique identifier'
            },
            email: {
              type: 'string',
              description: 'Recipient email address'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID this recipient belongs to'
            },
            channel_name: {
              type: 'string',
              description: 'Channel name this recipient belongs to'
            },
            registration_date: {
              type: 'string',
              format: 'date-time',
              description: 'Recipient registration date'
            },
            last_notification_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date of last notification sent to recipient'
            },
            status: {
              type: 'string',
              enum: ['subscribed', 'unsubscribed'],
              description: 'Recipient subscription status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Recipient creation date'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Recipient last update date'
            }
          }
        },
        CreateRecipientRequest: {
          type: 'object',
          required: ['email', 'channel_id'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address',
              minLength: 1,
              maxLength: 255
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID this recipient belongs to'
            },
            status: {
              type: 'string',
              enum: ['subscribed', 'unsubscribed'],
              description: 'Recipient subscription status',
              default: 'subscribed'
            }
          }
        },
        UpdateRecipientRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address',
              minLength: 1,
              maxLength: 255
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID this recipient belongs to'
            },
            status: {
              type: 'string',
              enum: ['subscribed', 'unsubscribed'],
              description: 'Recipient subscription status'
            },
            last_notification_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date of last notification sent to recipient'
            }
          }
        },
        Newsletter: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Newsletter unique identifier'
            },
            subject: {
              type: 'string',
              description: 'Newsletter subject line'
            },
            content: {
              type: 'string',
              description: 'Newsletter content (HTML)'
            },
            status: {
              type: 'string',
              enum: ['draft', 'scheduled', 'sent'],
              description: 'Newsletter status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date when newsletter is scheduled to be sent'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID this newsletter belongs to'
            },
            header_image_url: {
              type: 'string',
              description: 'URL to newsletter header image'
            },
            preview_text: {
              type: 'string',
              description: 'Preview text shown in email clients'
            },
            sent_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date when newsletter was actually sent'
            },
            recipient_count: {
              type: 'integer',
              description: 'Number of recipients this newsletter was sent to'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Newsletter creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        CreateNewsletterRequest: {
          type: 'object',
          required: ['subject', 'content', 'channel_id'],
          properties: {
            subject: {
              type: 'string',
              description: 'Newsletter subject line'
            },
            content: {
              type: 'string',
              description: 'Newsletter content (HTML)'
            },
            status: {
              type: 'string',
              enum: ['draft', 'scheduled', 'sent'],
              description: 'Newsletter status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date when newsletter is scheduled to be sent'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID this newsletter belongs to'
            },
            header_image_url: {
              type: 'string',
              description: 'URL to newsletter header image'
            },
            preview_text: {
              type: 'string',
              description: 'Preview text shown in email clients'
            },
            recipient_count: {
              type: 'integer',
              description: 'Number of recipients this newsletter was sent to'
            }
          }
        },
        UpdateNewsletterRequest: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Newsletter subject line'
            },
            content: {
              type: 'string',
              description: 'Newsletter content (HTML)'
            },
            status: {
              type: 'string',
              enum: ['draft', 'scheduled', 'sent'],
              description: 'Newsletter status'
            },
            publish_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date when newsletter is scheduled to be sent'
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID this newsletter belongs to'
            },
            header_image_url: {
              type: 'string',
              description: 'URL to newsletter header image'
            },
            preview_text: {
              type: 'string',
              description: 'Preview text shown in email clients'
            },
            sent_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date when newsletter was actually sent'
            },
            recipient_count: {
              type: 'integer',
              description: 'Number of recipients this newsletter was sent to'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
};

// Create custom swagger options that detect correct base URL
const swaggerOptions = {
  ...options,
  swaggerDefinition: {
    ...options.definition,
    servers: [
      {
        url: config.nodeEnv === 'production' 
          ? 'https://your-domain.com' 
          : '{swaggerBaseUrl}', // This will be replaced by middleware
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server'
      }
    ]
  }
};

export const specs = swaggerJsdoc(swaggerOptions);
