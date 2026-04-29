@AGENTS.md

Promptly — Full Product Vision & Context

What Promptly Is:

Promptly is a fully customizable service request, ordering, and operations platform. It is completely business agnostic. QR codes are the entry point for customer-facing use cases, but the platform is bigger than that — it serves established businesses, startups, and internal operations teams.

Three Core Use Cases:

Use Case 1 — Established Businesses
For businesses that already have a POS system and existing billing infrastructure. Promptly does NOT replace their POS — it fills the gap between a customer wanting something and staff knowing about it instantly. Think Fremont Golf Club — members charge to their account as always, Promptly just makes sure the order gets to staff immediately. Works for any service business — golf clubs, restaurants, hotels, breweries, marinas, spas, stadiums.

Use Case 2 — Startup/Small Businesses
For businesses with no existing payment system that need an end to end solution. They build out their menu/marketplace in Promptly, connect their own Stripe API key, and have a complete commerce platform. No POS needed. Payments go directly from customer to the business via Stripe — Promptly never touches the money.

Use Case 3 — Internal Operations & Advanced Note Taking
A private internal workspace for businesses or individuals. No public facing ordering page, no QR codes for customers. Used for internal tracking — inventory, notes, tasks, anything the business needs to manage internally. Available as an add-on for Use Case 1 and 2 customers, or as a standalone product.

Add-On Feature — Advanced Analytics
Order history, best selling items, peak times, revenue trends, inventory insights. Available as a premium add-on. Businesses purchasing multiple use cases may receive this bundled.

Key Positioning:

-Promptly does NOT compete with POS systems for established businesses
-Promptly IS the POS system for startups who need one
-Use Case 1 and Use Case 2 have separate pricing tiers reflecting different needs

Current Build Status:

Customer order page with menu items, categories, modifiers with pricing, pickup/delivery toggle, delivery location input, customer ID field, order summary
Admin dashboard with menu management, modifier groups, settings tab with customizable labels and toggles
Slack notifications firing on order submission with full order details
Orders saving to Supabase
Live on Vercel at promptly-pi-sable.vercel.app
GitHub repo at prestonjtracy/Promptly

Immediate Build Priorities:

Complete UI rewrite — clean, modern, mobile-first, business agnostic. Apple/Stripe aesthetic.
Venue branding — logo upload and primary color in admin, applied to customer page
Basic Stripe payments — optional, each business connects their own Stripe account via API key in admin settings
Full flow tested on real phone

After MVP is done:

Pitch Fremont Golf Club (Use Case 1)
Staff page with Mark Complete button
Order history dashboard
Session expiry logic
Custom domain per venue
Branded QR codes
Advanced analytics dashboard
Internal workspace (Use Case 3)

Tech Stack:
Next.js 16 (App Router, TypeScript, Tailwind CSS), Supabase, Slack webhooks, Stripe (coming), Vercel deployment.
Owner:
Preston Tracy — solo builder, vibe coding with Claude Code in Cursor.

## Known follow-ups

### `reorderRequests` partial-failure pattern (`app/actions/admin.ts:160-182`)
Same shape as the `reorderTabs` bug fixed in commit `f1dcfe4`: a JS for-loop
of sequential `UPDATE`s on `menu_items.sort_order`, no schema constraint.
A failure midway can leave duplicate `sort_order` values within a venue,
and the database has no `UNIQUE` to catch it.

**Fix shape (when ready):** mirror the `reorderTabs` solution —
1. Add a `DEFERRABLE INITIALLY DEFERRED` UNIQUE constraint to `menu_items`.
2. Create a `SECURITY DEFINER` Postgres function that does a single
   `UPDATE … FROM unnest(p_item_ids) WITH ORDINALITY` and validates that
   every id belongs to the venue.
3. `REVOKE EXECUTE` from `public, anon, authenticated`; call via the
   service-role client from `reorderRequests`.
4. Renumber any pre-existing duplicates as a migration step before the
   constraint is added.

**Design decision needed before fixing:** `menu_items` has both `venue_id`
and a nullable `category_id`. Today the customer page groups items by
category, so visually the order is per-category. Do we want:

- **Option A** — `UNIQUE (venue_id, sort_order)`. One global ordering per
  venue. Simpler, matches `venue_tabs`. Loses the implicit "items within a
  category have their own ordering" property.
- **Option B** — `UNIQUE (venue_id, category_id, sort_order)`. Per-category
  ordering. More accurate to current rendering; needs a `NULLS NOT
  DISTINCT` clause (Postgres 15+) so uncategorized items aren't all
  collapsed into one slot.

The Phase-2 custom-tabs work may also reshape this (items will increasingly
key on `tab_id` instead of `category_id`), so it's worth landing the tab
relationship before settling the constraint.

### Editorial masthead — monogram fallback when `logo_url` is null
The Claude Design mock for the Editorial chassis showed a stylized "SGC"
monogram circle in the masthead. The current chassis at
`app/order/[venueSlug]/_chassis/editorial/masthead.tsx` reads
`venue.logo_url` and renders an `<img>` when set, otherwise renders nothing
above the wordmark — there's no auto-generated monogram fallback.

**Fix shape (when ready):** add a small `MonogramMark` primitive that
derives initials from `venue.name` (e.g. "Sunset Golf Club" → "SGC", or
the first letter of each word capped at 3) and renders them inside a
hairline circle in the same 62×62 footprint the `<img>` occupies. Use
`venue.primary_color` for the ring stroke so the mark stays brand-aware.
Render conditional: `logo_url ? <img> : <MonogramMark>`.

**Design decision needed before fixing:** how to derive initials for
single-word names ("Fremont" → "F"? "FR"?), names with stop-words
("The Harbor Pier" → "THP" or "HP"?), and venues with non-Latin
characters. Worth deferring until there's a real second venue with no
logo so the rule can be tested against real data.