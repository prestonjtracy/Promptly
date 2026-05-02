-- =============================================================
-- Promptly Seed Data — Sample Golf Course Venue
-- =============================================================
-- Run this in the Supabase SQL Editor after applying the migration.

-- Venue
insert into public.venues (
  id,
  name,
  slug,
  primary_color,
  accent_color,
  location_type_label,
  customer_id_label,
  customer_id_required,
  allow_pickup,
  allow_delivery,
  delivery_location_required,
  show_prices,
  chassis
)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Sunset Golf Club',
  'sunset-golf',
  '#1e3a2f',
  '#f59e0b',
  'Cart',
  'Member #',
  false,
  true,
  true,
  false,
  false,
  'editorial'
);

-- Locations (golf carts)
insert into public.locations (venue_id, code, name) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-1', 'Cart 1'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-2', 'Cart 2'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-3', 'Cart 3'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-4', 'Cart 4'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-5', 'Cart 5'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-6', 'Cart 6'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-7', 'Cart 7'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-8', 'Cart 8'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-9', 'Cart 9'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'sun-cart-10', 'Cart 10');

-- Menu Categories
insert into public.menu_categories (id, venue_id, name, sort_order) values
  ('b1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Drinks', 0),
  ('b1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Snacks', 1),
  ('b1b2c3d4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Services', 2);

-- Menu Items
insert into public.menu_items (venue_id, category_id, name, description, sort_order) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000001', 'Water',         'Bottled water',              0),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000001', 'Soft Drink',    'Coke, Sprite, or Dr Pepper', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000001', 'Beer',          'Domestic or craft',          2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000001', 'Sports Drink',  'Gatorade or Powerade',       3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000002', 'Hot Dog',       'Grilled hot dog',            0),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000002', 'Chips',         'Assorted chips',             1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000002', 'Trail Mix',     'Nut and fruit mix',          2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000003', 'Towel',         'Fresh cold towel',           0),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000003', 'Sunscreen',     'SPF 50 sunscreen',           1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1b2c3d4-0000-0000-0000-000000000003', 'Course Ranger', 'Request a ranger visit',     2);
