-- Fremont order-flow readiness.
--
-- Adds venue-level switches for price visibility, delivery-location
-- requiredness, and future chassis selection. Also normalizes Sunset Golf's
-- cart location codes to the QR-code scheme and ensures carts 1-10 exist.

alter table public.venues
  add column show_prices boolean not null default true,
  add column delivery_location_required boolean not null default true,
  add column chassis text not null default 'editorial'
    check (chassis in ('editorial'));

-- Sunset/Fremont is a POS-bridge venue: Promptly routes requests to staff,
-- while the venue handles charging in its existing POS.
update public.venues
set
  show_prices = false,
  delivery_location_required = false,
  chassis = 'editorial'
where slug = 'sunset-golf';

-- Production was verified with four active Sunset locations named Cart 1-4
-- and codes 1-4. QR generation expects sun-cart-1 through sun-cart-10, so
-- make the existing rows match that scheme by cart name.
with sunset as (
  select id from public.venues where slug = 'sunset-golf'
)
update public.locations l
set code = 'sun-cart-' || substring(l.name from '^Cart ([0-9]+)$')
from sunset
where l.venue_id = sunset.id
  and l.name ~ '^Cart ([0-9]+)$'
  and substring(l.name from '^Cart ([0-9]+)$')::int between 1 and 10;

-- Add any missing cart rows up to 10. The NOT EXISTS checks make this safe
-- to re-run in environments that already have some or all carts.
with sunset as (
  select id from public.venues where slug = 'sunset-golf'
),
cart_numbers as (
  select generate_series(1, 10) as n
)
insert into public.locations (venue_id, code, name, is_active)
select
  sunset.id,
  'sun-cart-' || cart_numbers.n,
  'Cart ' || cart_numbers.n,
  true
from sunset
cross join cart_numbers
where not exists (
  select 1
  from public.locations existing
  where existing.venue_id = sunset.id
    and (
      existing.code = 'sun-cart-' || cart_numbers.n
      or existing.name = 'Cart ' || cart_numbers.n
    )
);
