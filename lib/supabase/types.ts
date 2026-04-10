export type Venue = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  location_type_label: string
  customer_id_label: string | null
  customer_id_required: boolean
  allow_pickup: boolean
  allow_delivery: boolean
  allow_notes: boolean
  delivery_location_placeholder: string | null
  passcode: string
  features: VenueFeatures
  created_at: string
  updated_at: string
}

/** Feature flags for workspace-level gating. New features default to false. */
export type VenueFeatures = {
  analytics?: boolean
  // Future: advanced_routing, premium_integrations, custom_workflows
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
  name: string
  description: string | null
  price: number | null
  icon_url: string | null
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
  venue_id: string
  location_id: string
  fulfillment: FulfillmentType
  delivery_location: string | null
  customer_id_value: string | null
  status: OrderStatus
  notes: string | null
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
