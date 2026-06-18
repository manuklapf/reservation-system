-- Multi-table reservations
-- Run this in your Supabase SQL Editor

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS table_ids JSONB DEFAULT '[]';

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS table_identifiers JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_reservations_table_ids
    ON reservations USING GIN (table_ids);
