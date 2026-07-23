-- ---------------------------------------------------------------------------
-- Subscription cancellation feedback
-- Stores the free-text reason captured by the account page's cancel-subscription
-- modal. Written only by the /api/subscription/cancel route using the
-- service-role key. Run in the SAME Supabase project as the app + subscriptions.
-- ---------------------------------------------------------------------------

create table if not exists public.subscription_cancellations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  ls_subscription_id text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists subscription_cancellations_tenant_idx
  on public.subscription_cancellations (tenant_id);

create index if not exists subscription_cancellations_user_idx
  on public.subscription_cancellations (user_id);

-- Enable RLS with no client-facing policies: every write happens server-side
-- via the service-role key (which bypasses RLS). Customers never read this.
alter table public.subscription_cancellations enable row level security;
