# Promptly — Handoff Memo

For the next coding agent (Codex). Reflects the actual state of the repo at commit `d9f9878` on `main`.

## Product direction

Promptly is a customizable service-request, ordering, and operations platform — business-agnostic, mobile-first. QR codes are one entry point but not the only one. Three positioned use cases (see `CLAUDE.md` for the full vision):

1. **Established businesses** with their own POS — Promptly fills the gap between a customer wanting something and staff knowing about it. Doesn't replace the POS. Target: Fremont Golf Club.
2. **Startup / small businesses** with no payment infra — Promptly *is* the POS, customer connects their own Stripe key.
3. **Internal operations** — private workspace, no QR codes, internal tracking only.

Owner: Preston Tracy, solo developer. Live at `promptly-pi-sable.vercel.app`.

## Current state

- **Branch:** `main` (commit `d9f9878`)
- **Uncommitted (tracked):** `.claude/settings.local.json` (Claude Code permission cache), `package-lock.json` (drift from local installs)
- **Untracked clutter — DO NOT delete without owner sign-off:**
  - `.claude/worktrees/` — leftover from earlier sessions; AGENTS.md prohibits new worktrees. Safe to remove eventually.
  - `app/admin/admin/` — duplicate of `app/admin/` from a botched move. Documented for cleanup, not removed.
  - `node_modules_old/` — pre-existing dir, **breaks `next build`'s type-check pass**. Move aside before building locally; Vercel never sees it (untracked + not in `.gitignore` but never committed).
  - `package-lock 2.json` — duplicate lockfile.
  - `supabase/migrations/00015_custom_tabs_patch.sql` — optional defensive patch from a prior session. Idempotent; never applied in prod and isn't required.

## Last 10 commits

```
d9f9878 Document monogram-fallback follow-up for the Editorial masthead
7baf9db Fix masthead so location_subhead renders in the right corner
1663f96 Drop opsz axis from Newsreader so next/font accepts the config
9401b43 Add Order Page Copy section to Workspace settings
5d0f478 Extend updateWorkspaceSettings with Order Page Copy fields
de26b24 Switch /order/[venueSlug] to OrderShell; remove legacy components
856d78e Add chassis-agnostic order shell and Editorial chassis
d1b7279 Add editorial-chassis schema, types, and font wiring
d72751f Migrate pricing + tech-stack rules from CLAUDE.md to AGENTS.md
46158bd Add branch-and-review, docs-only, and scope-discipline rules to AGENTS
```

## Last 5 commits — files changed and why

| Commit | Files | Reason |
|---|---|---|
| `d9f9878` | `CLAUDE.md` | Adds monogram-fallback to Known follow-ups (deferred design work). |
| `7baf9db` | `app/order/[venueSlug]/_chassis/editorial/masthead.tsx`, `menu-screen.tsx`, `_shell/chassis-types.ts`, `_shell/derive-chassis-config.ts` | Two-corner subtitle in the masthead (`tagline` left, `${location_subhead} ${location_code}` right). Adds `locationCode` to ChassisConfig; reverts a misplaced `config.locationSubhead` use in `SectionRule`. |
| `1663f96` | `app/order/[venueSlug]/layout.tsx` | Drops `axes: ['opsz']` from `Newsreader()` — `next/font` rejects `weight + axes` together on variable fonts. Was blocking Vercel production builds. |
| `9401b43` | `app/admin/_components/workspace-settings.tsx` | Adds the "Order Page Copy" UI card (8 chassis fields) between Branding and Payments. |
| `5d0f478` | `app/actions/admin.ts` | Extends `updateWorkspaceSettings` server action with the 8 chassis-copy fields + validation (enum guard for `billing_state`, integer range for ETA). |

## Architecture in effect

### Chassis system (customer order page)
- **Chassis-agnostic shell** at `app/order/[venueSlug]/_shell/`:
  - `order-shell.tsx` — picks chassis, holds state.
  - `use-order-state.ts` — state machine (`menu` → `item` → `cart` → `confirm`) + Stripe-or-direct submit branching.
  - `chassis-types.ts` — `ChassisProps`, `OrderState`, `ChassisActions`, `ChassisConfig`.
  - `derive-chassis-config.ts` — pure venue+location → ChassisConfig mapping.
- **Editorial chassis** at `app/order/[venueSlug]/_chassis/editorial/`:
  - `index.tsx` switches on `state.screen`.
  - 4 screens: `masthead.tsx` (rendered inside menu), `menu-screen.tsx`, `item-screen.tsx`, `cart-screen.tsx`, `confirm-screen.tsx`.
  - 5 primitives in `_primitives/`.
  - `tokens.ts` references `--font-newsreader` / `--font-inter` from the route layout.
- **Critical swappability constraint:** the data layer stays chassis-agnostic. No chassis-specific fields in the `Venue` type or `venues` schema. Adding chassis #2 (e.g. "Modern") = create `_chassis/modern/`, switch on `venue.chassis` in `order-shell.tsx`. No type or shell changes elsewhere.
- **Custom tabs UI integration is paused.** The `venue_tabs` table and admin TabsManager are intact, but the customer-facing tab nav doesn't render in Editorial v1. Items show grouped by `menu_categories` regardless of the `custom_tabs` feature flag.

### Venue config schema
Eight chassis copy fields on `venues` (migration 00021): `tagline`, `location_subhead`, `location_question_label`, `submit_cta_label` (NOT NULL default `'Submit Request'`), `success_headline` (NOT NULL default `'On its way.'`), `fulfillment_copy`, `default_fulfillment_eta_minutes`, `billing_state` (CHECK `'house_account'|'tab'|'complimentary'|'paid'`).

### RLS posture
- **Wide-open RLS** on most tables (`venues`, `locations`, `menu_items`, `menu_categories`, `modifier_groups`, `modifier_options`, `orders`, `order_items`, `venue_tabs`). Auth is gated in **server actions**, not RLS.
- **Locked-down (RLS on, NO policies, service-role only):** `super_admin_sessions`, `super_admin_login_attempts`, `payment_failures`.
- **Column-level REVOKE** on sensitive columns: `venues.stripe_secret_key`, `venues.passcode`, `venues.passcode_hash` — all REVOKEd from `anon, authenticated`. Read only via `lib/supabase/service.ts`.

### Stripe state
- **Per-venue keys.** Each venue connects its own Stripe account.
- **Encrypted at rest** via `lib/crypto/stripe-key.ts` (AES-256-GCM, format `v1:<iv>:<ct>:<tag>`). Plaintext passthrough during the rollout; new writes always encrypt.
- **Plan-gated:** only `venue.plan_type === 'full_commerce'` can set Stripe fields; `pos_only` venues never see the Payments UI.
- **Refund-on-failure recovery** (`lib/payments/handle-failed-order.ts`): if `submitOrder` fails after a Stripe success, an automatic refund is issued, audited in `payment_failures`, and a Slack alert fires if the refund itself fails.

### Auth
- **Venue admin:** bcrypt-hashed passcode in `venues.passcode_hash`. Login at `/admin/login`. Cookie `promptly_admin_venue` carries the venue UUID.
- **Super admin:** plaintext passcode in `SUPER_ADMIN_PASSCODE` env var, constant-time-compared. Login at `/super-admin/login`. Cookie `promptly_super_admin` carries a 64-char hex token from `super_admin_sessions`. Rate-limited via `check_and_record_super_admin_attempt` RPC (5 attempts / 15 min sliding window, advisory-locked per IP). IP source: `x-vercel-forwarded-for` only when `x-vercel-id` proves we're on Vercel; otherwise rate limit falls back to a single shared bucket.

## Known follow-ups, bugs, unfinished work

No `TODO`/`FIXME` comments anywhere in app code. Open work is captured in `CLAUDE.md` § "Known follow-ups":

1. **`reorderRequests` partial-failure pattern** (`app/actions/admin.ts:160-182`) — same JS-for-loop-of-UPDATEs shape that was fixed for `reorderTabs` in commit `f1dcfe4`. Fix shape mirrors the tabs solution but needs a design decision on `UNIQUE (venue_id, sort_order)` vs `UNIQUE (venue_id, category_id, sort_order)`.
2. **Editorial masthead monogram fallback** — when `venue.logo_url` is null the masthead currently shows nothing above the wordmark. The Claude Design mock implied a monogram. Deferred until there's a second logo-less venue to test against.

**Test infrastructure:** there is no test runner installed. No Vitest, no Jest, no Playwright. No `test` script. Verification has been per-PR via locally-run scripts and an agent-driven security review pass; not durable. Adding a test framework is an open item but hasn't been scoped.

**Custom tabs UI** is on the schema but doesn't render in the customer chassis (see Architecture). Picked up by admin via TabsManager; flag to expose on the customer side when ready.

## Commands

```sh
# install
npm install

# dev server (http://localhost:3000)
npm run dev

# production build (typechecks)
npm run build

# start a built app
npm run start

# lint
npm run lint

# no test runner exists
```

**Migrations:** there is no Supabase CLI workflow. Apply each new migration manually by pasting its content into the Supabase SQL editor in dashboard order. Migrations live at `supabase/migrations/`. Number sequentially (`00022_*.sql` is next). Production has migrations through `00021` applied (verified live via REST API as of `d9f9878`).

**Local-build gotcha:** `npm run build` will fail TypeScript pass because of `node_modules_old/` (untracked leftover dir). Move it aside before building:
```sh
mv node_modules_old /tmp/_nmo && npm run build ; mv /tmp/_nmo ./node_modules_old
```
Vercel doesn't see the dir so production builds work without this dance.

## Environment variables

Required at runtime (no values shown — see `.env.local` and Vercel project settings):

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Anon key for browser/client requests under RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS; used by `lib/supabase/service.ts` for trusted reads/writes (Stripe key column, super-admin tables, payment failures). Never imported into a `'use client'` file. |
| `SLACK_WEBHOOK_DEFAULT` | server only | Fallback webhook for order notifications when no per-item channel is set. |
| `SLACK_BOT_TOKEN` | server only | Slack Bot OAuth token (`xoxb-…`) for `chat.postMessage` to specific channels. |
| `STRIPE_KEY_ENCRYPTION_SECRET` | server only | 32 random bytes, base64-encoded. Encrypts `venues.stripe_secret_key` at rest via AES-256-GCM. **Losing this means all stored Stripe keys become unreadable.** Generate with `openssl rand -base64 32`. |
| `SUPER_ADMIN_PASSCODE` | server only | Plaintext passcode for `/super-admin/login`. Constant-time compared. If unset, super-admin is unreachable (refuses all logins). |
| `NODE_ENV` | runtime | Used to gate `secure: true` on auth cookies. |

## Files / directories to avoid editing

- **All migrations `00001`–`00021`** — already applied in production. Forward-only; do not edit. Add new sequential files for new schema work.
- **`node_modules/`** — generated.
- **`.next/`** — generated.
- **`node_modules_old/`** — leftover; if you touch anything here it'll be reverted on next install. Move aside for local builds (see Commands).
- **`app/admin/admin/`** — botched-move duplicate of `app/admin/`. Untracked. Don't reference from new code. Cleanup is owner's call.
- **`.claude/`** — Claude Code config; not your concern.
- **`scripts/migrate-stripe-keys.mjs`** — one-shot bulk migration script. Don't run unless the operator asks; it's idempotent but it's a manual tool.

## Project rules (from `AGENTS.md`, must follow)

- **No git worktrees.** Use `git checkout -b <branch>` directly in the project folder.
- **Branch-per-fix-or-feature.** Each change gets a branch. Fast-forward merges to main only after the security review is clean. No formal PRs (solo project) — security review is the quality gate.
- **Docs-only changes commit straight to main.** No branch dance for `*.md`-only edits.
- **Scope discipline.** When a fix surfaces related issues (same bug pattern in another file), flag them — do not auto-fix. The owner decides whether to address now, defer, or document.
- **Pricing.** Never propose pricing numbers or tier prices in any artifact. Pricing is intentionally undefined.
- **Tech stack boundary.** Stack is Next.js 16, Supabase, Slack webhooks, Stripe (per-venue), Vercel. Don't add new infrastructure (Redis, separate auth providers, queues, search engines, alternative DBs) without flagging the proposal first.
- **Next.js 16 is not the Next you trained on.** APIs and conventions diverge from the typical training cutoff. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code; treat training-data knowledge as suspect.

## Recommended next steps

In rough priority order, given the actual repo state:

1. **Wait for the owner to populate** `tagline`, `location_subhead`, and `logo_url` for Sunset Golf via `/admin → Workspace → Order Page Copy`. The masthead two-corner layout is deployed; only data is missing for the design mock to render correctly.
2. **`reorderRequests` atomic-fix follow-up** (CLAUDE.md item #1). Schema-decision-blocked but ready to scope.
3. **Test framework.** No automated tests exist; scope a minimal Vitest + Playwright setup with the owner before relying on agent-only verification long-term.
4. **Re-integrate `custom_tabs` UI** with the Editorial chassis (currently paused; the data layer is in place). Needs a design pass for how a tab nav fits into the magazine layout.
5. **Untracked-clutter cleanup** — remove `node_modules_old/`, `app/admin/admin/`, `package-lock 2.json` after owner sign-off. Not security-sensitive but reduces friction.
6. **Monogram fallback for the masthead** (CLAUDE.md item #2). Deferred until a second logo-less venue exists; revisit when Fremont onboards or another venue lacks a logo.
7. **Vercel deploy hygiene.** The build infrastructure is fine, but consider adding a `prebuild` script or a `tsconfig.json` `exclude` entry for `node_modules_old/` so local builds don't need the move-aside dance.

When in doubt: read `CLAUDE.md` for product context, `AGENTS.md` for rules, then ask the owner before assuming.
