-- Migration: Allow multiple tables to share the same name.
-- Run this SQL in your Supabase SQL Editor.

ALTER TABLE tables
DROP CONSTRAINT IF EXISTS tables_tenant_id_table_identifier_key;

ALTER TABLE tables
DROP CONSTRAINT IF EXISTS tables_tenant_id_floor_id_table_identifier_key;
