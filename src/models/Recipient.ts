export interface Recipient {
  id: string;
  email: string;
  channel_id: string;
  registration_date: Date;
  last_notification_date?: Date;
  status: RecipientStatus;
  created_at: Date;
  updated_at: Date;
}

export type RecipientStatus = 'subscribed' | 'unsubscribed';

export interface CreateRecipientRequest {
  email: string;
  channel_id: string;
  status?: RecipientStatus;
}

export interface UpdateRecipientRequest extends Partial<CreateRecipientRequest> {
  id: string;
  last_notification_date?: Date;
}
