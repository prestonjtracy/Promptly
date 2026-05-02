# Promptly — Product Context

## What Promptly does

Promptly is a customizable service request and operations platform for venues. The core flow is simple: a customer signals what they want — typically by scanning a QR code at a physical location, but the entry point is flexible — sees a venue-configured menu of items or services, places an order, and staff get notified instantly via Slack. Orders are saved to a Postgres database, staff fulfill them, customers get the goods.

The product is intentionally **business-agnostic**. Same underlying platform serves a private golf club, a brewery, a marina, a hotel, a country club. What changes between venues is the configuration — menu items, modifier groups, location codes (cart/slip/room/table), branding, the words on the customer-facing page. The platform itself is a "blank canvas" that adapts to the venue.

QR codes are the primary entry point today because they fit the most common use case (customer at a physical location, no app download, instant access). But Promptly's value is the platform underneath — request routing, staff notification, order history, configurable menus, payment infrastructure when needed. The QR layer is one input mechanism, not the product itself. Future input paths could include direct URLs, kiosk modes, NFC, internal staff entry, or anything else that resolves to a venue-and-location pair.

## Three core use cases

**Use Case 1 — Established businesses with their own POS.** These are venues that already have payment infrastructure (member accounts, room charges, tabs). Promptly does NOT replace their POS. It bridges the gap between a customer wanting something and staff knowing about it. Charges go through the venue's existing system. This is the primary pitch target right now — specifically Fremont Golf Club, a private course.

**Use Case 2 — Startup/small businesses without existing payment infrastructure.** These venues use Promptly as a full commerce platform. They connect their own Stripe account via API key in admin settings, build out their menu, and Promptly handles orders end-to-end including payment. Promptly never touches the money — Stripe routes funds directly from customer to venue.

**Use Case 3 — Internal operations and advanced note-taking.** A private internal workspace for businesses or individuals. No customer-facing entry points. Used for inventory tracking, internal task management, shift handoffs, SOP documentation. Available as an add-on for Use Case 1 or 2 customers, or as a standalone product. This is largely undeveloped — flagged as future direction.

## Who it serves

Service-based venues with physical locations and staff who fulfill requests. Specifically: golf clubs, breweries, marinas, hotels, country clubs, restaurants, spas, stadiums, food trucks. The common thread is "customer is at a known physical spot, staff need to bring them something or do something for them."

The first specific target is **Fremont Golf Club**, a private course in Fremont, Nebraska. Use Case 1 fit: they have member accounts and a POS, they just need a faster way to route beverage cart orders from members to staff than the current system. Pitch hasn't happened yet — the build is being polished first. No firm timeline; quality of demo matters more than speed.

## Build approach

Solo non-developer ("vibe coding") using Claude Code as the primary engineering tool. Architecture decisions tend to favor scope discipline — features go on a "known follow-ups" list rather than getting shipped half-done. Security review runs as a Claude Code routine on every push. Branches are one-issue-per-branch with fast-forward merges only after review is clean. No formal pull requests with human reviewers — solo project, the routine is the gate.

## What I'm optimizing for first

The single most important thing right now is **closing Fremont Golf Club as the first paying customer.** Everything else is secondary to that. This means:

1. The customer-facing order page needs to be polished enough that walking through it on a phone in a Fremont GM's office produces a clear "yes, we want this." UI quality is the closer, not feature count.

2. The admin experience needs to be self-serve enough that Fremont's staff can manage their own menu without me logging in for them. Currently most fields are admin-editable through the Workspace tab; a few customer-facing copy fields were just added.

3. Pricing strategy needs to be defined. Currently no pricing exists. Likely landing on something like $2,500-5,000 setup fee + $300-500/month subscription, but TBD until I'm actually in the conversation with Fremont.

4. Onboarding for the first ~10 customers will be manual (I configure them in Supabase). Self-serve onboarding is a deferred problem — solving it before customer #2 exists is premature.

## Constraints

- Solo builder, no co-founders, no engineering team
- No funding, no runway pressure, no investor expectations — this is bootstrapped
- Pre-launch, no paying customers, no revenue
- Full-time pace is whatever I can put in around other commitments
- Time horizon is "as long as it takes to do this right" — quality of build matters more than speed
