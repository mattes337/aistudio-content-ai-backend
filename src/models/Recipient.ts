import type { PaginatedResponse } from '../utils/pagination';

export interface Recipient {
  id: string;
  email: string;
  channel_id: string;
  registration_date: Date;
  last_notification_date?: Date;
  status: RecipientStatus;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type RecipientStatus = 'subscribed' | 'unsubscribed';

/**
 * Recipient list item - partial data returned in list endpoints.
 * Excludes the full `data` field to keep response sizes small.
 */
export interface RecipientListItem {
  id: string;
  email: string;
  channel_id: string;
  channel_name?: string;
  registration_date: Date;
  last_notification_date?: Date;
  status: RecipientStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Query options for filtering, sorting, and paginating recipients.
 */
export interface RecipientQueryOptions {
  search?: string;           // Search in email
  status?: RecipientStatus;  // Filter by status
  channel_id?: string;       // Filter by channel
  sort_by?: 'email' | 'status' | 'registration_date' | 'last_notification_date' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;            // Max 100, default 50
  offset?: number;           // Default 0
}

export type PaginatedRecipients = PaginatedResponse<RecipientListItem>;

export interface CreateRecipientRequest {
  email: string;
  channel_id: string;
  status?: RecipientStatus;
  data?: Record<string, unknown>;
}

export interface UpdateRecipientRequest extends Partial<CreateRecipientRequest> {
  id: string;
  last_notification_date?: Date;
}
