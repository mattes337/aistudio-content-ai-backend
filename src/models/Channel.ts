export interface Channel {
  id: string;
  name: string;
  url: string;
  type: ChannelType;
  platformApi: PlatformApi;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type ChannelType = 'website' | 'instagram' | 'facebook' | 'x';
export type PlatformApi = 'none' | 'wordpress' | 'instagram_graph' | 'facebook_graph' | 'x_api';

export interface CreateChannelRequest {
  name: string;
  url: string;
  type: ChannelType;
  platformApi: PlatformApi;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateChannelRequest extends Partial<CreateChannelRequest> {
  id: string;
}
