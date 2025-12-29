-- Add folder_path column to knowledge_sources for folder organization
-- Migration: 004_add_knowledge_source_folder_path.sql

-- Add folder_path column (nullable, allows organizing sources into virtual folders)
-- Examples: "my-files", "my-files/subA/texts", "research/papers"
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS folder_path TEXT;

-- Create index for efficient folder filtering and tree queries
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_folder_path ON knowledge_sources(folder_path);

-- Create index for prefix matching (useful for finding all items in a folder and subfolders)
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_folder_path_pattern ON knowledge_sources(folder_path text_pattern_ops);

-- Insert migration record
INSERT INTO schema_migrations (migration_name) VALUES ('004_add_knowledge_source_folder_path');
