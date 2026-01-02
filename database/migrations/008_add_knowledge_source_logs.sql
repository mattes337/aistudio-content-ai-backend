-- Migration: Add knowledge_source_logs table for processing history
-- Description: Stores processing events for knowledge sources (sync, transformations, errors)

CREATE TABLE IF NOT EXISTS knowledge_source_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('info', 'warning', 'error', 'success')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_logs_source_id
    ON knowledge_source_logs(knowledge_source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_source_logs_created_at
    ON knowledge_source_logs(created_at DESC);

COMMENT ON TABLE knowledge_source_logs IS 'Processing history for knowledge sources';
COMMENT ON COLUMN knowledge_source_logs.event_type IS 'Type of event: sync_started, sync_completed, sync_failed, transform_applied, etc.';
COMMENT ON COLUMN knowledge_source_logs.status IS 'Event status: info, warning, error, success';
COMMENT ON COLUMN knowledge_source_logs.metadata IS 'Additional context for the event';
