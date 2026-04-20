-- Per-venue Stripe Checkout (MVP, no Connect, no webhooks).
-- plan_type gates whether payments UI is visible at all.
-- stripe_secret_key is never exposed to anon/authenticated clients.
alter table public.venues
  add column plan_type text not null default 'pos_only'
    check (plan_type in ('pos_only', 'full_commerce')),
  add column payments_enabled boolean not null default false,
  add column stripe_secret_key text;

-- Column-level lockdown: keep anon/authenticated reads of the venues row
-- working for the customer order page and admin dashboard, but block the
-- secret key. A misused .select('stripe_secret_key') from a browser client
-- will fail loudly instead of silently returning the value.
revoke select (stripe_secret_key) on public.venues from anon, authenticated;

-- Idempotency anchor for the success-page order rehydration flow.
alter table public.orders add column stripe_session_id text unique;
