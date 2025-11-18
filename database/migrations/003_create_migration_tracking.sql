-- Migration 003: Create migration tracking table
-- This migration creates a table to track which migrations have been applied

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial migrations as already applied (since they represent the current state)
-- Note: 001_initial_schema.sql already includes newsletters, so 002 is redundant
INSERT INTO schema_migrations (migration_name) VALUES 
('001_initial_schema.sql')
ON CONFLICT (migration_name) DO NOTHING;
