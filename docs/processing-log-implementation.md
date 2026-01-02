# Processing Log Implementation Guide

This document outlines the backend changes required to capture and expose processing logs for knowledge sources.

## Current State

The `knowledge_sources.data` JSONB field has a designed but unimplemented `ingestionLog` array field. Currently:
- No processing events are captured during sync operations
- No endpoint exists to retrieve processing history

## Required Changes

### 1. Database Schema Update

Add a new table to store processing logs (more efficient than JSONB for querying):

```sql
CREATE TABLE knowledge_source_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- 'sync_started', 'sync_completed', 'sync_failed', 'transform_applied', etc.
    status VARCHAR(20) NOT NULL,      -- 'info', 'warning', 'error', 'success'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',      -- Additional context (e.g., transformation name, error details)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_source_logs_source_id ON knowledge_source_logs(knowledge_source_id);
CREATE INDEX idx_knowledge_source_logs_created_at ON knowledge_source_logs(created_at DESC);
```

### 2. Backend Service Updates

**File: `services/backend/src/services/DatabaseService.ts`**

Add methods for log operations:

```typescript
// Add to DatabaseService class

static async createKnowledgeSourceLog(
    sourceId: string,
    eventType: string,
    status: 'info' | 'warning' | 'error' | 'success',
    message: string,
    metadata?: Record<string, any>
): Promise<void> {
    const query = `
        INSERT INTO knowledge_source_logs
        (knowledge_source_id, event_type, status, message, metadata)
        VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [sourceId, eventType, status, message, metadata ?? {}]);
}

static async getKnowledgeSourceLogs(
    sourceId: string,
    limit = 50,
    offset = 0
): Promise<{ logs: KnowledgeSourceLog[]; total: number }> {
    const countQuery = `
        SELECT COUNT(*) FROM knowledge_source_logs
        WHERE knowledge_source_id = $1
    `;
    const logsQuery = `
        SELECT * FROM knowledge_source_logs
        WHERE knowledge_source_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    `;

    const [countResult, logsResult] = await Promise.all([
        pool.query(countQuery, [sourceId]),
        pool.query(logsQuery, [sourceId, limit, offset])
    ]);

    return {
        logs: logsResult.rows,
        total: parseInt(countResult.rows[0].count, 10)
    };
}
```

### 3. API Endpoint

**File: `services/backend/src/routes/knowledge-sources.ts`**

Add new endpoint:

```typescript
/**
 * GET /api/knowledge-sources/:sourceId/logs
 * Get processing logs for a knowledge source
 */
router.get('/:sourceId/logs', KnowledgeSourceController.getKnowledgeSourceLogs);
```

**File: `services/backend/src/controllers/KnowledgeSourceController.ts`**

Add controller method:

```typescript
static async getKnowledgeSourceLogs(req: Request, res: Response) {
    try {
        const { sourceId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const source = await DatabaseService.getKnowledgeSourceById(sourceId);
        if (!source) {
            return res.status(404).json({ message: 'Knowledge source not found' });
        }

        const result = await DatabaseService.getKnowledgeSourceLogs(sourceId, limit, offset);
        res.json({
            data: result.logs,
            total: result.total,
            limit,
            offset
        });
    } catch (error) {
        logger.error('Error fetching knowledge source logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
```

### 4. Processor Service Updates

**File: `services/processor/src/modules/open-notebook/sync.service.ts`**

Add logging calls during sync operations:

```typescript
// Import the logging service (needs to be added to processor)
import { logKnowledgeSourceEvent } from '../../database/repositories/knowledge-source-logs.repository';

// In syncSource method, add logging:
async syncSource(source: KnowledgeSource, channels: Channel[]) {
    await logKnowledgeSourceEvent(source.id, 'sync_started', 'info', 'Starting sync to Open Notebook');

    try {
        const notebookSource = await this.createOrUpdateSource(source, primaryNotebook);
        await logKnowledgeSourceEvent(source.id, 'sync_completed', 'success',
            `Successfully synced to Open Notebook (source: ${notebookSource.id})`);

        // Log transformation applications
        for (const transformationName of toApply) {
            await logKnowledgeSourceEvent(source.id, 'transform_applied', 'success',
                `Applied transformation: ${transformationName}`,
                { transformationName, insightId: insight.id }
            );
        }

        return { notebookSourceId: notebookSource.id, success: true };
    } catch (error) {
        await logKnowledgeSourceEvent(source.id, 'sync_failed', 'error',
            `Sync failed: ${error.message}`,
            { error: error.message, stack: error.stack }
        );
        throw error;
    }
}
```

### 5. TypeScript Types

**File: `services/backend/src/models/KnowledgeSource.ts`**

Add the log interface:

```typescript
export interface KnowledgeSourceLog {
    id: string;
    knowledge_source_id: string;
    event_type: string;
    status: 'info' | 'warning' | 'error' | 'success';
    message: string;
    metadata: Record<string, any>;
    created_at: Date;
}
```

## Event Types Reference

| Event Type | Description |
|------------|-------------|
| `sync_started` | Sync operation initiated |
| `sync_completed` | Sync completed successfully |
| `sync_failed` | Sync failed with error |
| `transform_applied` | Transformation applied to source |
| `transform_removed` | Transformation removed from source |
| `file_uploaded` | File uploaded for source |
| `file_deleted` | File deleted from source |
| `source_created` | Knowledge source created |
| `source_updated` | Knowledge source updated |

## Migration Script

Create migration file `migrations/XXXXXX_add_knowledge_source_logs.sql`:

```sql
-- Up
CREATE TABLE IF NOT EXISTS knowledge_source_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Down
DROP TABLE IF EXISTS knowledge_source_logs;
```

## API Response Format

```json
{
    "data": [
        {
            "id": "uuid",
            "knowledge_source_id": "uuid",
            "event_type": "sync_completed",
            "status": "success",
            "message": "Successfully synced to Open Notebook",
            "metadata": {
                "notebookSourceId": "abc123"
            },
            "created_at": "2024-01-02T10:00:00Z"
        }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
}
```

## Frontend Integration

The frontend can now call:
- `GET /api/knowledge-sources/:sourceId/logs` - Get processing logs

Response includes paginated logs with event type, status, message, and any additional metadata.
