-- Migration: 007_add_deleted_processing_status.sql
-- Description: Add 'deleted' value to processing_status enum for soft delete support

ALTER TYPE processing_status ADD VALUE IF NOT EXISTS 'deleted';
