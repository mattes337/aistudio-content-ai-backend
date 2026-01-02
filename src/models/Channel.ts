import type { PaginatedResponse } from '../utils/pagination';

export interface Channel {
  id: string;
  name: string;
  url: string;
  type: ChannelType;
  platform_api: PlatformApi;
  credentials?: Record<string, any>;
  data?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type ChannelType = 'website' | 'instagram' | 'facebook' | 'x' | 'newsletter';
export type PlatformApi = 'none' | 'wordpress' | 'instagram_graph' | 'facebook_graph' | 'x_api' | 'email_api';

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
  credentials?: Record<string, any>;
  data?: Record<string, any>;
}

export interface UpdateChannelRequest extends Partial<CreateChannelRequest> {
  id: string;
}

