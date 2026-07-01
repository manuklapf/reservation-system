-- Migration: Reservation requests (guest widget) and approved_by tracking
-- Run this in your Supabase SQL Editor

-- 1. Add is_requested flag (true = submitted by a guest via the widget)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS is_requested BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add approved_by (stores the display name of the staff member who created/approved)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- 3. Grant the anon role raw INSERT access on the reservations table.
--    Without this, RLS policies for anon are never even evaluated.
GRANT INSERT ON reservations TO anon;

-- 4. Allow guests (anon) to submit reservation requests via the public widget.
--    The WITH CHECK restricts inserts to rows that are flagged as guest requests
--    with no created_by and a valid tenant_id.
DROP POLICY IF EXISTS "Allow guest reservation requests" ON reservations;
CREATE POLICY "Allow guest reservation requests" ON reservations
  FOR INSERT
  TO anon
  WITH CHECK (
    is_requested = TRUE
    AND created_by IS NULL
    AND approved_by IS NULL
    AND tenant_id IS NOT NULL
  );

-- 5. Allow anonymous users to read the tenant name/slug for the widget.
--    (The original schema already has "Public can view tenant info" — this is a fallback.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'Tenants are publicly readable'
  ) THEN
    CREATE POLICY "Tenants are publicly readable" ON tenants
      FOR SELECT TO anon USING (true);
  END IF;
END;
$$;
