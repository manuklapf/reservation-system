-- Demo sandboxes (public "try it out" link)
-- Run this SQL in your Supabase SQL Editor.
--
-- Every visitor of /demo gets a throwaway tenant of its own, seeded with a
-- busy restaurant's data. The sandbox is deleted 24 hours after it was
-- created, which resets everything the visitor entered.

ALTER TABLE tenants
  -- Marks a tenant as a throwaway demo sandbox. Never set on real accounts.
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  -- When the sandbox (and everything in it) gets deleted.
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMP WITH TIME ZONE,
  -- auth.users id of the auto-provisioned demo login, so cleanup can delete
  -- the auth user without scanning the whole user list.
  ADD COLUMN IF NOT EXISTS demo_user_id UUID;

-- Cleanup sweeps query expired sandboxes only, so index just those rows.
CREATE INDEX IF NOT EXISTS idx_tenants_demo_expires_at
  ON tenants (demo_expires_at)
  WHERE is_demo;

-- Deleting a tenant cascades to staff, tables, floor_plans and reservations
-- (all of which reference tenants ON DELETE CASCADE), so the sweep only has to
-- delete the tenant row plus the auth user.
