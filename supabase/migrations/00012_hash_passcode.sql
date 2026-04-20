-- Hash admin passcodes at rest.
-- Previously stored in plaintext on venues.passcode and (inadvertently) selected
-- in VENUE_PUBLIC_COLUMNS, which shipped the passcode to every customer's
-- browser via the public order page. This migration adds a bcrypt hash column,
-- backfills it from the plaintext, and revokes access for anon/authenticated.

create extension if not exists pgcrypto;

alter table public.venues
  add column passcode_hash text;

-- Backfill: bcrypt every existing passcode. Cost factor 10 is the bcryptjs
-- default and produces hashes verifiable by bcryptjs.compare().
update public.venues
  set passcode_hash = crypt(passcode, gen_salt('bf', 10))
  where passcode_hash is null;

alter table public.venues
  alter column passcode_hash set not null;

-- Column-level lockdown: only the service role (used by the login server
-- action) may read either the new hash or the legacy plaintext column.
-- A stray .select('passcode') from a browser client now fails loudly instead
-- of silently leaking the secret.
revoke select (passcode, passcode_hash) on public.venues from anon, authenticated;
