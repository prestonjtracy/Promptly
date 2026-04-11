-- =============================================================
-- NEW BUSINESS TEMPLATE
-- =============================================================
-- Copy this file, fill in the values below, and run in Supabase
-- SQL Editor to create a new business/workspace.
--
-- After running:
-- 1. Admin login: /admin/login → slug + passcode
-- 2. Customer page: /order/<slug>?cart=<location-code>
-- =============================================================

-- ── Step 1: Create the business ──────────────────────────────

insert into public.venues (
  name,
  slug,
  logo_url,
  primary_color,
  accent_color,
  location_type_label,
  customer_id_label,
  customer_id_required,
  allow_pickup,
  allow_delivery,
  allow_notes,
  delivery_location_placeholder,
  default_slack_channel,
  passcode,
  features
) values (
  'Your Business Name',          -- name: display name
  'your-business-slug',          -- slug: URL-safe, unique (used in /order/<slug>)
  null,                          -- logo_url: set later or leave null
  '#1a1a1a',                     -- primary_color: header/branding color
  '#2563eb',                     -- accent_color: buttons/accents
  'Location',                    -- location_type_label: "Table", "Room", "Cart", etc.
  null,                          -- customer_id_label: "Member #", "Room #", null to hide
  false,                         -- customer_id_required
  true,                          -- allow_pickup
  true,                          -- allow_delivery
  true,                          -- allow_notes
  null,                          -- delivery_location_placeholder
  null,                          -- default_slack_channel: e.g. "#orders"
  '0000',                        -- passcode: admin login password
  '{"analytics": true}'          -- features: toggle analytics etc.
);

-- ── Step 2: Add locations (QR code endpoints) ────────────────
-- Each location gets a unique code for QR URLs.
-- URL format: /order/<slug>?cart=<code>

insert into public.locations (venue_id, code, name) values
  ((select id from venues where slug = 'your-business-slug'), 'loc-1', 'Location 1'),
  ((select id from venues where slug = 'your-business-slug'), 'loc-2', 'Location 2'),
  ((select id from venues where slug = 'your-business-slug'), 'loc-3', 'Location 3');

-- ── Step 3: Add categories (optional) ────────────────────────

insert into public.menu_categories (venue_id, name, sort_order) values
  ((select id from venues where slug = 'your-business-slug'), 'Category 1', 0),
  ((select id from venues where slug = 'your-business-slug'), 'Category 2', 1);

-- ── Step 4: Add requests/items ───────────────────────────────
-- Add these via the admin dashboard (/admin/login) for easier management.
-- Or insert directly:

-- insert into public.menu_items (venue_id, category_id, name, description, price, sort_order) values
--   ((select id from venues where slug = 'your-business-slug'),
--    (select id from menu_categories where venue_id = (select id from venues where slug = 'your-business-slug') and name = 'Category 1'),
--    'Item Name', 'Description', 5.00, 0);
