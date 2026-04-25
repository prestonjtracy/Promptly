-- Document and audit the new at-rest encryption for venues.stripe_secret_key.
--
-- The column itself doesn't change shape — it still holds a single text value
-- per venue. What changed is the FORMAT inside it: previously raw 'sk_live_*'
-- plaintext, now an AES-256-GCM blob 'v1:<iv>:<ct>:<tag>' produced by
-- lib/crypto/stripe-key.ts using the STRIPE_KEY_ENCRYPTION_SECRET env var.
--
-- The application still reads/writes through the same column, so no DDL
-- migration of values is required. Decryption transparently accepts legacy
-- 'sk_*' rows during rollout, and any plaintext row gets re-encrypted the
-- next time an admin saves the key in workspace settings (or via the
-- one-shot script: scripts/migrate-stripe-keys.mjs).

comment on column public.venues.stripe_secret_key is
  'AES-256-GCM ciphertext, format v1:<iv_b64>:<ciphertext_b64>:<tag_b64>. '
  'Plaintext sk_* values are accepted transitionally and re-encrypted on '
  'next write. Encrypted with STRIPE_KEY_ENCRYPTION_SECRET (32-byte key). '
  'See lib/crypto/stripe-key.ts.';

-- Audit notice: warn the operator if any plaintext keys remain so the
-- bulk migration script can be run. Pure RAISE NOTICE, no data changes.
do $$
declare
  legacy_count int;
begin
  select count(*)
    into legacy_count
    from public.venues
    where stripe_secret_key is not null
      and stripe_secret_key like 'sk\_%' escape '\';

  if legacy_count > 0 then
    raise notice
      'Promptly: % venue(s) still hold plaintext Stripe keys. Run `node scripts/migrate-stripe-keys.mjs` to encrypt them.',
      legacy_count;
  else
    raise notice 'Promptly: no plaintext Stripe keys found.';
  end if;
end $$;
