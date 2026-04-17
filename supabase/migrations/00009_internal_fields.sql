alter table public.menu_items add column internal_notes text;
alter table public.menu_items add column internal_only boolean not null default false;
