-- Hardening of what the public anon key can read
-- Run this SQL in your Supabase SQL Editor.
--
-- The anon key ships inside the browser bundle, so it must be treated as
-- public knowledge. Two policies from the original schema were more generous
-- than the app needs:
--
--   1. "Public can view tenant info" exposed *every* column of tenants,
--      including the Lemon Squeezy customer/subscription ids of paying
--      accounts. The widget only needs the restaurant's name and whether the
--      account is still active.
--   2. "Public can view confirmed reservations" made any reservation with
--      status = 'confirmed' world-readable — guest names, phone numbers,
--      email addresses and notes. Nothing in the app reads that column, and
--      no public view uses the policy, but it stays a landmine as long as it
--      exists.

-- ── 1. Column-level access on tenants ──────────────────────────────────────
-- Row access stays as it is (the widget resolves a restaurant by slug without
-- being logged in); this narrows *which columns* those roles may read.
-- Anything not listed here — ls_subscription_id, ls_customer_id, demo_user_id
-- — becomes readable only through the service role.

REVOKE SELECT ON tenants FROM anon, authenticated;

-- The public booking widget: name to display, plan status to hide the widget
-- for locked accounts.
GRANT SELECT (id, name, slug, plan_status, trial_ends_at)
  ON tenants TO anon;

-- Signed-in staff additionally need the demo flags for the countdown banner.
GRANT SELECT (id, name, slug, plan_status, trial_ends_at, is_demo, demo_expires_at)
  ON tenants TO authenticated;

-- ── 2. Drop the public reservation read ────────────────────────────────────
-- Guests submit requests through the widget (INSERT, still allowed) but never
-- read reservations back.

DROP POLICY IF EXISTS "Public can view confirmed reservations" ON reservations;
