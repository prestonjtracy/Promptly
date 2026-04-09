alter table public.venues add column allow_notes boolean not null default true;
alter table public.venues add column delivery_location_placeholder text;
