-- Trial / billing support for tenants
-- Run this SQL in your Supabase SQL Editor.

-- Account plan status:
--   'trial'   -> 14-day trial, full access until trial_ends_at
--   'active'  -> paid subscription, full access, no banner/gate
--   'expired' -> trial ended without payment, access locked (pay or export only)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan_status IN ('trial', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE
    NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT;

-- Backfill existing tenants: give them a fresh 14-day trial from now.
UPDATE tenants
SET trial_ends_at = NOW() + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;

-- Block guest reservation requests for locked (expired) accounts.
-- Recreate the guest INSERT policy with a tenant-status check so the lock is
-- enforced server-side, not just in the widget UI.
--   locked = plan_status = 'expired', OR a trial whose deadline has passed.
--   'active' accounts are never locked.
DROP POLICY IF EXISTS "Allow guest reservation requests" ON reservations;
CREATE POLICY "Allow guest reservation requests" ON reservations
  FOR INSERT
  TO anon
  WITH CHECK (
    is_requested = TRUE
    AND created_by IS NULL
    AND approved_by IS NULL
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenants tt
      WHERE tt.id = tenant_id
        AND tt.plan_status <> 'expired'
        AND (tt.plan_status = 'active' OR tt.trial_ends_at > NOW())
    )
  );
