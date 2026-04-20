-- Platform-level tier label for each venue. Managed exclusively from the
-- super-admin page (not venue-configurable). Kept as free-form text so adding
-- a new tier is a one-line change to the app-side config rather than a
-- migration. Default 'basic' so every existing row gets a sensible value.
alter table public.venues
  add column tier text not null default 'basic';
