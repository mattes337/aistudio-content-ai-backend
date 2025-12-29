-- Fix generic_image enum value (re-apply since 002 failed in transaction)
-- This migration runs outside a transaction due to ALTER TYPE ADD VALUE
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'generic_image';
