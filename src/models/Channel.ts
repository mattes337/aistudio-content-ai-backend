import type { PaginatedResponse } from '../utils/pagination';

// =============================================================================
// Platform Credentials
// =============================================================================

/** WordPress (platform_api: 'wordpress') */
export interface WordPressCredentials {
  username: string;
  applicationPassword: string;  // WordPress Application Password
}

/** Instagram (platform_api: 'instagram_graph') */
export interface InstagramCredentials {
  accessToken: string;
  userId: string;
}

/** Facebook (platform_api: 'facebook_graph') */
export interface FacebookCredentials {
  accessToken: string;
  pageId: string;
}

/** X/Twitter (platform_api: 'x_api') */
export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

/** Email/Newsletter provider types */
export type EmailProvider = 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark';

/** Email/Newsletter (platform_api: 'email_api') */
export interface EmailCredentials {
  provider: EmailProvider;
  // SMTP provider
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  // API-based providers (SendGrid, Mailgun, Postmark, SES, etc.)
  apiKey?: string;
  // Common
  fromEmail: string;
  fromName?: string;
}

/** Union type for all platform credentials */
export type ChannelCredentials =
  | WordPressCredentials
  | InstagramCredentials
  | FacebookCredentials
  | XCredentials
  | EmailCredentials;

// =============================================================================
// Platform Settings
// =============================================================================

/** WordPress SEO plugin options */
export type SeoPlugin = 'auto' | 'yoast' | 'rankmath' | 'aioseo' | 'seopress' | 'surerank' | 'none';

/** WordPress reverse proxy configuration */
export interface WordPressProxySettings {
  forwardedHost: string;   // e.g., "wptest.drydev.de"
  forwardedProto: 'http' | 'https';
}

/** WordPress settings */
export interface WordPressSettings {
  defaultStatus?: 'draft' | 'pending' | 'publish';
  defaultAuthor?: number;  // WP user ID
  seoPlugin?: SeoPlugin;
  proxy?: WordPressProxySettings;
}

/** Instagram settings */
export interface InstagramSettings {
  defaultHashtags?: string[];
  locationId?: string;
}

/** Facebook settings */
export interface FacebookSettings {
  defaultAudience?: 'public' | 'friends' | 'only_me';
}

/** X/Twitter settings */
export interface XSettings {
  defaultReplySettings?: 'everyone' | 'following' | 'mentionedUsers';
}

/** Email/Newsletter settings */
export interface EmailSettings {
  replyTo?: string;
  template?: string;  // Default template name
}

/** Union type for all platform settings */
export type ChannelSettings =
  | WordPressSettings
  | InstagramSettings
  | FacebookSettings
  | XSettings
  | EmailSettings;

// =============================================================================
// Channel Metadata (Content AI Hints)
// =============================================================================

export interface ChannelMetadata {
  description?: string;      // Channel description
  language?: string;         // e.g., "de", "en"
  brandTone?: string;        // e.g., "professional", "casual", "friendly"
  targetAudience?: string;   // e.g., "B2B executives", "young adults"
  contentGuidelines?: string; // Additional AI instructions
}

// =============================================================================
// Channel Data Structure
// =============================================================================

/**
 * The channel.data JSON column structure.
 * Flat, intuitive structure with clear separation of concerns.
 */
export interface ChannelData {
  credentials?: ChannelCredentials;
  settings?: ChannelSettings;
  metadata?: ChannelMetadata;
}

// =============================================================================
// Channel Types
// =============================================================================

export type ChannelType = 'website' | 'instagram' | 'facebook' | 'x' | 'newsletter';
export type PlatformApi = 'none' | 'wordpress' | 'instagram_graph' | 'facebook_graph' | 'x_api' | 'email_api';

export interface Channel {
  id: string;
  name: string;
  url: string;
  type: ChannelType;
  platform_api: PlatformApi;
  data?: ChannelData;
  created_at: Date;
  updated_at: Date;
}

/**
 * Channel list item - partial data returned in list endpoints.
 * Excludes credentials and data fields to keep response sizes small.
 */
export interface ChannelListItem {
  id: string;
  name: string;
  url: string;
  type: ChannelType;
  platform_api: PlatformApi;
  created_at: Date;
  updated_at: Date;
}

/**
 * Query options for filtering, sorting, and paginating channels.
 */
export interface ChannelQueryOptions {
  search?: string;           // Search in name or url
  type?: ChannelType;        // Filter by type
  platform_api?: PlatformApi; // Filter by platform_api
  sort_by?: 'name' | 'type' | 'platform_api' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedChannels = PaginatedResponse<ChannelListItem>;

export interface CreateChannelRequest {
  name: string;
  url: string;
  type: ChannelType;
  platform_api: PlatformApi;
  data?: ChannelData;
}

export interface UpdateChannelRequest extends Partial<CreateChannelRequest> {
  id: string;
}

