-- Migration: Tables now belong to a specific floor
-- Run this SQL in your Supabase SQL Editor after the tables + floor_plans schemas.

-- 1. Add the floor_id column. A table belongs to exactly one floor; deleting a
--    floor removes the tables that live on it.
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES floor_plans(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tables_floor_id ON tables(floor_id);

-- 2. Backfill: assign each existing table to the floor whose saved layout already
--    contains it (i.e. where it is currently placed on the canvas).
UPDATE tables t
SET floor_id = fp.id
FROM floor_plans fp
WHERE fp.tenant_id = t.tenant_id
  AND t.floor_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(fp.layout) AS elem
    WHERE elem ->> 'id' = t.id::text
  );

-- 3. Any table that was never placed on a canvas falls back to the tenant's
--    first floor (lowest sort_order) so it still shows up somewhere.
UPDATE tables t
SET floor_id = (
  SELECT fp.id
  FROM floor_plans fp
  WHERE fp.tenant_id = t.tenant_id
  ORDER BY fp.sort_order, fp.created_at
  LIMIT 1
)
WHERE t.floor_id IS NULL;

-- 4. Table names only need to be unique within a floor now, so two floors can
--    each have a table with the same identifier.
ALTER TABLE tables
DROP CONSTRAINT IF EXISTS tables_tenant_id_table_identifier_key;

ALTER TABLE tables
ADD CONSTRAINT tables_tenant_id_floor_id_table_identifier_key
UNIQUE (tenant_id, floor_id, table_identifier);
