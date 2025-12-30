-- Migration: 2025-12-30_151900_add_deleted_to_processing_status.sql
-- Description: Add 'deleted' value to processing_status enum for soft delete support

ALTER TYPE processing_status ADD VALUE IF NOT EXISTS 'deleted';
