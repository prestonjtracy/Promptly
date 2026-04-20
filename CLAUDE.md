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
-Pricing is TBD and intentionally not defined yet

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