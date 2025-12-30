-- Add Open Notebook sync tracking columns to knowledge_sources
-- Migration: 005_add_open_notebook_sync.sql

-- Add column to track when the source was last synced to Open Notebook
ALTER TABLE knowledge_sources
ADD COLUMN IF NOT EXISTS open_notebook_synced_at TIMESTAMPTZ;

-- Add column to store Open Notebook source IDs per channel
-- Format: {"channel_id": "notebook_source_id", ...}
-- This allows tracking which notebook source corresponds to which channel
ALTER TABLE knowledge_sources
ADD COLUMN IF NOT EXISTS open_notebook_source_ids JSONB DEFAULT '{}';

-- Create index for efficient sync status queries
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_open_notebook_synced
ON knowledge_sources(open_notebook_synced_at);

-- Insert migration record
INSERT INTO schema_migrations (migration_name) VALUES ('005_add_open_notebook_sync');
