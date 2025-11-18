export interface Newsletter {
  id: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  publish_date?: Date;
  channel_id: string;
  header_image_url?: string;
  preview_text?: string;
  sent_date?: Date;
  recipient_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNewsletterRequest {
  subject: string;
  content: string;
  status?: 'draft' | 'scheduled' | 'sent';
  publish_date?: Date;
  channel_id: string;
  header_image_url?: string;
  preview_text?: string;
  recipient_count?: number;
}

export interface UpdateNewsletterRequest {
  id: string;
  subject?: string;
  content?: string;
  status?: 'draft' | 'scheduled' | 'sent';
  publish_date?: Date;
  channel_id?: string;
  header_image_url?: string;
  preview_text?: string;
  sent_date?: Date;
  recipient_count?: number;
}
