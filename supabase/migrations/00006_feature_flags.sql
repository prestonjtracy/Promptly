-- Feature flags for workspace-level feature gating.
-- New features default to off so existing workspaces aren't affected.
alter table public.venues add column features jsonb not null default '{}';

-- Seed the analytics flag for existing venues
update public.venues set features = '{"analytics": true}';
