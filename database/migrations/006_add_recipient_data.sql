-- Migration: Add data JSONB column to recipients table
-- Purpose: Store dynamic recipient fields (name, gender, etc.) for email template personalization

ALTER TABLE recipients ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Add GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_recipients_data ON recipients USING GIN (data);

-- Example data structure:
-- {
--   "name": "John Doe",
--   "first_name": "John",
--   "last_name": "Doe",
--   "gender": "male",
--   "company": "Acme Inc",
--   "custom_field": "any value"
-- }
