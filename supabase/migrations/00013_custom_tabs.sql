-- Per-venue customizable tabs. Gated behind features->custom_tabs in the app.
-- Phase 1 ships two active types (requests, info); the enum includes 'internal'
-- and 'form' so phases 2+ don't require DB changes, just code.

create table public.venue_tabs (
  id         uuid primary key default uuid_generate_v4(),
  venue_id   uuid not null references public.venues(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('requests', 'info', 'internal', 'form')),
  -- Type-specific payload. For 'info': { body: string }. For 'form'/'internal':
  -- reserved for future phases. The app validates shape; the DB just stores.
  config     jsonb not null default '{}'::jsonb,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_venue_tabs_venue on public.venue_tabs(venue_id);

alter table public.venue_tabs enable row level security;

-- Matches the existing wide-open RLS pattern elsewhere in this schema —
-- actual authz lives in server actions that check the admin cookie.
create policy "Anyone can read venue tabs"
  on public.venue_tabs for select using (true);
create policy "Anyone can insert venue tabs"
  on public.venue_tabs for insert with check (true);
create policy "Anyone can update venue tabs"
  on public.venue_tabs for update using (true) with check (true);
create policy "Anyone can delete venue tabs"
  on public.venue_tabs for delete using (true);

create trigger trg_venue_tabs_updated_at
  before update on public.venue_tabs
  for each row execute function public.update_updated_at();

-- Associate each menu_item with a tab. Nullable: legacy rows and venues
-- without the custom_tabs feature leave this null and keep the existing
-- category-based rendering on the customer page.
alter table public.menu_items
  add column tab_id uuid references public.venue_tabs(id) on delete set null;

create index idx_menu_items_tab on public.menu_items(tab_id);
