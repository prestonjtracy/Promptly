export type PlanType = 'pos_only' | 'full_commerce'

/** Receipt billing state for the customer-facing order chassis. Drives which
 *  closing line the confirmation screen shows. Independent of payments_enabled
 *  — admins set both. See migration 00021. */
export type BillingState = 'house_account' | 'tab' | 'complimentary' | 'paid'

export type Venue = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  /** Noun used for a location row, e.g. "Hole" / "Pier" / "Slip".
   *  Distinct from location_subhead below — that one is the masthead
   *  subhead phrasing ("ON CART", "ON SLIP"). Don't conflate. */
  location_type_label: string
  customer_id_label: string | null
  customer_id_required: boolean
  allow_pickup: boolean
  allow_delivery: boolean
  allow_notes: boolean
  delivery_location_placeholder: string | null
  default_slack_channel: string | null
  features: VenueFeatures
  plan_type: PlanType
  payments_enabled: boolean
  tier: string

  // ── Editorial-chassis copy (and any future chassis). ─────────
  // All chassis-agnostic copy — what to say, not how to style it.
  /** Masthead subtitle, e.g. "EST. 1962" or "SLIP & SAIL". Null hides. */
  tagline: string | null
  /** Masthead subhead capitalized phrase, e.g. "ON CART" / "ON SLIP". Null hides. */
  location_subhead: string | null
  /** Cart-screen location-question label, e.g. "WHERE ON THE COURSE?".
   *  Null falls back to chassis default (Editorial: "WHERE ARE YOU?"). */
  location_question_label: string | null
  /** Cart submit CTA label. Default 'Submit Request' set in migration. */
  submit_cta_label: string
  /** Confirmation screen big headline. Default 'On its way.' in migration. */
  success_headline: string
  /** Confirmation body sentence, e.g. "The beverage cart will meet you at the
   *  next tee." Null falls back to a generic chassis sentence. */
  fulfillment_copy: string | null
  /** When set, the confirmation appends "Estimated arrival in N minutes."
   *  Null hides the ETA tail entirely. */
  default_fulfillment_eta_minutes: number | null
  /** Drives the receipt closing line on the confirmation screen. */
  billing_state: BillingState

  // Computed server-side. The raw stripe_secret_key column is never
  // loaded into this type — the REVOKE at the DB level enforces that
  // and a service-role client reads the key only inside trusted routes.
  hasStripeKey: boolean
  created_at: string
  updated_at: string
}

/** Columns safe to SELECT with anon/authenticated roles. Excludes stripe_secret_key
 *  and passcode/passcode_hash — those are REVOKEd at the DB level and read only
 *  through the service-role client inside trusted server actions. */
export const VENUE_PUBLIC_COLUMNS =
  'id, name, slug, logo_url, primary_color, accent_color, location_type_label, customer_id_label, customer_id_required, allow_pickup, allow_delivery, allow_notes, delivery_location_placeholder, default_slack_channel, features, plan_type, payments_enabled, tier, tagline, location_subhead, location_question_label, submit_cta_label, success_headline, fulfillment_copy, default_fulfillment_eta_minutes, billing_state, created_at, updated_at'

/** Feature flags for workspace-level gating. New features default to false. */
export type VenueFeatures = {
  analytics?: boolean
  custom_tabs?: boolean
  // Future: advanced_routing, premium_integrations, custom_workflows
}

/** Tab types. Phase 1 uses 'requests' and 'info'; 'internal' and 'form'
 *  are reserved for later phases but accepted by the DB check constraint. */
export type TabType = 'requests' | 'info' | 'internal' | 'form'

/** Info tab payload: a string of body text rendered on the customer page. */
export type InfoTabConfig = { body?: string }

export type VenueTab = {
  id: string
  venue_id: string
  name: string
  type: TabType
  config: InfoTabConfig | Record<string, never>
  sort_order: number
  created_at: string
  updated_at: string
}

export type Location = {
  id: string
  venue_id: string
  code: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MenuCategory = {
  id: string
  venue_id: string
  name: string
  sort_order: number
  created_at: string
}

export type MenuItem = {
  id: string
  venue_id: string
  category_id: string | null
  tab_id: string | null
  name: string
  description: string | null
  price: number | null
  icon_url: string | null
  slack_channel: string | null
  internal_notes: string | null
  internal_only: boolean
  internal_category: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FulfillmentType = 'pickup' | 'delivery'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type Order = {
  id: string
  order_number: number
  venue_id: string
  location_id: string
  fulfillment: FulfillmentType
  delivery_location: string | null
  customer_id_value: string | null
  status: OrderStatus
  notes: string | null
  stripe_session_id: string | null
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  selected_modifiers: SelectedModifier[]
  created_at: string
}

export type ModifierGroup = {
  id: string
  menu_item_id: string
  name: string
  sort_order: number
  created_at: string
}

export type ModifierOptionType = 'add' | 'remove'

export type ModifierOption = {
  id: string
  modifier_group_id: string
  name: string
  modifier_type: ModifierOptionType
  price_adjustment: number
  sort_order: number
  created_at: string
}

export type ModifierGroupWithOptions = ModifierGroup & {
  options: ModifierOption[]
}

export type SelectedModifier = {
  option_id: string
  group_name: string
  option_name: string
  modifier_type: ModifierOptionType
  price_adjustment: number
}

export type CartEntry = {
  cartKey: string
  menuItemId: string
  quantity: number
  selectedModifiers: SelectedModifier[]
}

export type MenuItemWithCategory = MenuItem & {
  category: MenuCategory | null
}

export type MenuItemWithModifiers = MenuItemWithCategory & {
  modifier_groups: ModifierGroupWithOptions[]
}

export type LocationWithVenue = Location & {
  venue: Venue
}

// ── Frontend aliases ─────────────────────────────────────────
// These map the database-level names to platform-level concepts.
// The underlying DB tables (menu_items, menu_categories, orders,
// order_items) remain unchanged — these aliases let frontend code
// think in terms of "requests" and "categories" instead.

/** A request type that customers can select (maps to menu_items table) */
export type Request = MenuItem

/** A request with its category attached */
export type RequestWithCategory = MenuItemWithCategory

/** A request with category + modifier groups */
export type RequestWithModifiers = MenuItemWithModifiers

/** A grouping of requests (maps to menu_categories table) */
export type Category = MenuCategory

/** A customer submission (maps to orders table) */
export type Submission = Order

/** A line item in a submission (maps to order_items table) */
export type SubmissionItem = OrderItem
