-- Atomic rate-limit primitive for super-admin login (security review #3.1).
--
-- The previous JS sequence cleanup → count → check-cap → maybe-insert was a
-- TOCTOU window: two concurrent requests could each see count=4, both pass
-- the cap check, and both insert — an attacker pipelining parallel attempts
-- could exceed the 5-per-15min limit. This RPC collapses the entire dance
-- into one transaction protected by a per-IP advisory lock, so concurrent
-- callers serialize and the cap is strict.
--
-- Inputs:
--   p_ip              — client IP (from getClientIp), used as the lock key
--                       and the row's ip column.
--   p_window_seconds  — sliding window in seconds (currently 900 = 15 min).
--   p_max_attempts    — strict upper bound (currently 5).
--
-- Returns:
--   true  — attempt allowed; row HAS BEEN INSERTED. Caller proceeds with
--           the constant-time passcode compare. On wrong passcode the row
--           stays as a failed-attempt record. On correct passcode the
--           caller separately clears this IP's rows.
--   false — rate-limited; no row inserted. Caller returns "Too many
--           attempts" without running any passcode comparison.
--
-- security definer because anon/authenticated have no privileges on
-- super_admin_login_attempts (table is RLS-on with no policies). The
-- function runs with the owner's permissions to do the work.

create or replace function public.check_and_record_super_admin_attempt(
  p_ip text,
  p_window_seconds int,
  p_max_attempts int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_window_start timestamptz := now() - make_interval(secs => p_window_seconds);
begin
  -- Per-IP lock: serializes concurrent attempts from the same source so the
  -- cleanup → count → insert sequence below is atomic for that IP. Different
  -- IPs lock independently. Released automatically at end of transaction.
  perform pg_advisory_xact_lock(hashtext(p_ip));

  -- Sweep stale rows for this IP first so the count is accurate.
  delete from public.super_admin_login_attempts
   where ip = p_ip
     and attempted_at < v_window_start;

  select count(*) into v_count
    from public.super_admin_login_attempts
   where ip = p_ip
     and attempted_at >= v_window_start;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.super_admin_login_attempts (ip)
    values (p_ip);

  return true;
end;
$$;

-- Lock down execution so a leaked anon key can't call this RPC and grow the
-- attempts table or game the rate limit. Only the service role (which the
-- super-admin server actions use) may invoke it.
revoke execute on function public.check_and_record_super_admin_attempt(text, int, int)
  from public, anon, authenticated;
