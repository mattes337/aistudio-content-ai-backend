-- Migration: Add feature_image_id to articles and newsletters
-- This allows associating a media asset as a feature image for these entities

-- Add feature_image_id column to articles
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS feature_image_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;

-- Add feature_image_id column to newsletters
ALTER TABLE newsletters
ADD COLUMN IF NOT EXISTS feature_image_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_articles_feature_image_id ON articles(feature_image_id) WHERE feature_image_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletters_feature_image_id ON newsletters(feature_image_id) WHERE feature_image_id IS NOT NULL;
