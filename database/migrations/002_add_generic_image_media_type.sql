-- Add generic_image to media_type enum
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'generic_image';
