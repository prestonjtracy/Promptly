-- Audit trail for the post-payment / pre-order failure window.
--
-- If submitOrder() fails after Stripe has already taken the customer's money
-- (tenancy mismatch, item gone, network blip, etc.) the success page issues
-- an automatic refund. This table records every such event so:
--   1. Subsequent page loads for the same session can detect the prior
--      failure and skip re-running submitOrder/refund logic (idempotency).
--   2. The platform owner has an audit trail of refund_id, failure reason,
--      and refund status (succeeded | pending | failed).
--   3. Operators can query this table for "money stuck" cases (refund_status
--      = 'failed') and intervene manually.
--
-- Lockdown: RLS is on with NO policies. Only the service role can read or
-- write. The success page is server-rendered and uses createServiceClient(),
-- so customer browsers can never see this table even via a crafted query.

create table public.payment_failures (
  stripe_session_id     text  primary key,
  payment_intent_id     text,
  venue_id              uuid  not null references public.venues(id) on delete cascade,
  charged_amount_cents  int,
  currency              text,
  failure_reason        text  not null,
  refund_id             text,
  refund_status         text  not null check (refund_status in ('succeeded', 'pending', 'failed')),
  refund_failure_reason text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_payment_failures_venue on public.payment_failures(venue_id);
create index idx_payment_failures_status on public.payment_failures(refund_status)
  where refund_status = 'failed';

alter table public.payment_failures enable row level security;
-- No policies → anon/authenticated denied. service_role bypasses RLS.

create trigger trg_payment_failures_updated_at
  before update on public.payment_failures
  for each row execute function public.update_updated_at();
