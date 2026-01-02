import type { PaginatedResponse } from '../utils/pagination';

export interface Newsletter {
  id: string;
  subject: string;
  status: NewsletterStatus;
  publish_date?: Date;
  channel_id: string;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type NewsletterStatus = 'draft' | 'scheduled' | 'sent';

/**
 * Newsletter list item - partial data returned in list endpoints.
 * Excludes the full `data` field to keep response sizes small.
 */
export interface NewsletterListItem {
  id: string;
  subject: string;
  status: NewsletterStatus;
  publish_date?: Date;
  channel_id: string;
  channel_name?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Query options for filtering, sorting, and paginating newsletters.
 */
export interface NewsletterQueryOptions {
  search?: string;           // Search in subject
  status?: NewsletterStatus; // Filter by status
  channel_id?: string;       // Filter by channel
  sort_by?: 'subject' | 'status' | 'publish_date' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedNewsletters = PaginatedResponse<NewsletterListItem>;

export interface CreateNewsletterRequest {
  subject: string;
  status?: NewsletterStatus;
  publish_date?: Date;
  channel_id: string;
  data?: Record<string, any>;
}

export interface UpdateNewsletterRequest extends Partial<CreateNewsletterRequest> {
  id: string;
}
