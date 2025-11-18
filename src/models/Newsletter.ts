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
