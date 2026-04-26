-- Atomic reorder for venue_tabs (security review #5).
--
-- The previous reorderTabs server action did sequential row-by-row UPDATEs
-- in a JS loop. A failure partway through left some rows updated and others
-- not — venues could end up with multiple tabs sharing a sort_order, with
-- nothing in the schema to prevent it.
--
-- This migration does three things in order:
--
--   1. Renumber any existing duplicate sort_order values per venue. A simple
--      row_number() over the current ordering produces a stable 0..N-1
--      sequence per venue. Idempotent: a venue without duplicates ends up
--      with the same values it started with.
--
--   2. Add a DEFERRABLE UNIQUE constraint on (venue_id, sort_order). With
--      INITIALLY DEFERRED, intermediate duplicates within a transaction are
--      tolerated, and the check fires at COMMIT — exactly what the new RPC
--      below needs to swap multiple rows in one statement.
--
--   3. Create reorder_venue_tabs(p_venue_id, p_tab_ids) — a SECURITY DEFINER
--      function that updates every passed-in tab's sort_order in a single
--      statement, then commits. All-or-nothing by virtue of being one
--      transaction. Validates that every tab id in the array belongs to
--      the venue before writing.

-- ── Step 1: cleanup pre-existing duplicate sort_order values ─────────
do $$
declare
  v_id uuid;
begin
  for v_id in select distinct venue_id from public.venue_tabs loop
    -- Stable order: by current sort_order, then created_at, then id. Ensures
    -- that ties resolve deterministically and the same migration produces
    -- the same result on a re-run.
    with ranked as (
      select id,
             row_number() over (
               partition by venue_id
               order by sort_order, created_at, id
             ) - 1 as new_order
        from public.venue_tabs
       where venue_id = v_id
    )
    update public.venue_tabs vt
       set sort_order = ranked.new_order
      from ranked
     where vt.id = ranked.id;
  end loop;
end $$;

-- ── Step 2: deferrable UNIQUE so atomic batch reorders can swap values ─
alter table public.venue_tabs
  add constraint venue_tabs_venue_sort_order_unique
  unique (venue_id, sort_order)
  deferrable initially deferred;

-- ── Step 3: atomic reorder RPC ───────────────────────────────────────
-- Single-statement update with `unnest(...) with ordinality` — Postgres
-- evaluates all new sort_order values from the array, then writes them.
-- Combined with the deferrable constraint above, intermediate duplicate
-- states inside this transaction are fine; the check runs at COMMIT.
--
-- Validation: every id in p_tab_ids must already belong to p_venue_id.
-- Mismatch raises an exception, which Supabase surfaces to the caller as
-- a PostgrestError so the JS path can return a clean error string.
--
-- security definer because anon/authenticated have no policies on
-- venue_tabs (well — the table has wide-open policies for the customer
-- page, but using definer is consistent with the rate-limit RPC pattern
-- and means a future RLS tightening doesn't break this function).
create or replace function public.reorder_venue_tabs(
  p_venue_id uuid,
  p_tab_ids  uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_expected int := coalesce(array_length(p_tab_ids, 1), 0);
begin
  if v_expected = 0 then
    return; -- nothing to do
  end if;

  -- All ids must belong to this venue. Reject the whole reorder if any
  -- of them doesn't, before writing anything.
  select count(*) into v_count
    from public.venue_tabs
   where venue_id = p_venue_id
     and id = any(p_tab_ids);

  if v_count <> v_expected then
    raise exception 'tab id ownership mismatch (got % matching, expected %)',
      v_count, v_expected;
  end if;

  -- Single-statement update. The deferrable UNIQUE means we can move tabs
  -- through intermediate duplicate sort_orders without tripping the check.
  update public.venue_tabs vt
     set sort_order = t.idx - 1
    from unnest(p_tab_ids) with ordinality as t(id, idx)
   where vt.id = t.id
     and vt.venue_id = p_venue_id;
end;
$$;

-- Lock down execute. The service-role client used by the admin server
-- action keeps execute via owner-bypass; anon/authenticated cannot call
-- this RPC directly to bulk-rewrite tab orderings.
revoke execute on function public.reorder_venue_tabs(uuid, uuid[])
  from public, anon, authenticated;
