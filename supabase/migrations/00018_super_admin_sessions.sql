-- Hardens super-admin auth in two ways (security review #3):
--
--   1. Replaces the literal '1' cookie value with a server-issued random
--      token. The cookie carries an opaque 64-hex-char string; the active
--      tokens live here. Verification is "row exists AND not expired".
--      Setting a cookie alone (via XSS or subdomain takeover) is no longer
--      enough to impersonate a super admin.
--
--   2. Adds DB-backed rate limiting on loginSuperAdmin. Each failed attempt
--      writes a row keyed by client IP; loginSuperAdmin counts recent rows
--      before allowing the bcrypt-style compare. 5 fails / 15 min lockout.
--
-- Both tables: RLS enabled with NO policies, so anon/authenticated cannot
-- touch them. Only the service role (used inside super-admin server actions)
-- can read or write — bypasses RLS by design.

create table public.super_admin_sessions (
  token      text  primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Lookup is by the PK; the explicit index is for the cleanup sweep that
-- runs at login time (delete where expires_at < now()).
create index idx_super_admin_sessions_expires
  on public.super_admin_sessions(expires_at);

alter table public.super_admin_sessions enable row level security;

create table public.super_admin_login_attempts (
  ip           text not null,
  attempted_at timestamptz not null default now()
);

-- Both query patterns use (ip, attempted_at): the rate-limit count and
-- the on-success cleanup. Composite index covers both.
create index idx_super_admin_login_attempts_ip_time
  on public.super_admin_login_attempts(ip, attempted_at desc);

alter table public.super_admin_login_attempts enable row level security;
