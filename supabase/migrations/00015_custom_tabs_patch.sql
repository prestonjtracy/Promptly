-- Idempotent safety-net for environments where an earlier draft of
-- 00013_custom_tabs.sql was applied. Everything functionally observable from
-- 00013 was confirmed present in production via REST API probes (CHECK
-- constraint, FKs with ON DELETE SET NULL on menu_items.tab_id, RLS policies,
-- updated_at trigger, defaults). The two items below are the only things that
-- couldn't be confirmed remotely; both are no-ops if 00013 was applied in
-- full, and re-runs of this file are safe at any time.

-- Indexes — performance only, never correctness. Safe to re-create.
create index if not exists idx_venue_tabs_venue on public.venue_tabs(venue_id);
create index if not exists idx_menu_items_tab   on public.menu_items(tab_id);

-- ON DELETE CASCADE on venue_tabs.venue_id → venues.id
-- Only relevant if you ever delete a venue. If the FK was created without
-- CASCADE (older draft of 00013), drop and recreate it. If 00013 in main was
-- applied, the FK already cascades and these statements are a wash.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'venue_tabs_venue_id_fkey'
      and confdeltype <> 'c'   -- 'c' = CASCADE
  ) then
    alter table public.venue_tabs
      drop constraint venue_tabs_venue_id_fkey;
    alter table public.venue_tabs
      add constraint venue_tabs_venue_id_fkey
      foreign key (venue_id) references public.venues(id) on delete cascade;
  end if;
end$$;
