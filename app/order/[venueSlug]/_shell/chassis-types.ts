/**
 * Chassis-agnostic contract.
 *
 * Every visual chassis (today: Editorial; later: Modern, etc.) accepts the
 * same shape and renders the customer order flow however it wants. The shell
 * owns all state and behavior; chassis components are pure presentation +
 * event dispatch.
 *
 * The fields here are deliberately the LCD across chassis. If adding a new
 * field requires touching a chassis to consume it, keep it on `ChassisConfig`
 * (chassis-agnostic-typed but chassis-specific in spirit) rather than baking
 * it into a chassis component's local props.
 */
import type {
  BillingState,
  CartEntry,
  FulfillmentType,
  Location,
  RequestWithModifiers,
  SelectedModifier,
  Venue,
} from '@/lib/supabase/types'

/** The current shell state. Read-only from chassis components — they dispatch
 *  via `actions` to mutate. */
export type OrderState = {
  /** Which screen the chassis should render. */
  screen: 'menu' | 'item' | 'cart' | 'confirm'
  /** Working cart. cartKey = menuItemId|sortedModifierOptionIds. */
  cart: CartEntry[]
  /** Set when `screen === 'item'`. The item being configured with modifiers. */
  activeItemId: string | null
  fulfillment: FulfillmentType
  customerIdValue: string
  notes: string
  deliveryLocation: string
  /** Submit in flight. Chassis should disable the CTA / show a spinner. */
  isPending: boolean
  /** User-facing error from the last submit attempt. Null when none. */
  error: string | null
  /** Set after a successful non-Stripe submit. The confirm screen reads this. */
  orderNumber: number | undefined
}

/** Resolved venue copy and modes that the chassis should render. Anything
 *  that depends on venue config is computed once in `derive-chassis-config.ts`
 *  and lives here so chassis components don't reach into raw venue fields
 *  for resolved values. */
export type ChassisConfig = {
  /** Masthead subtitle (e.g. "EST. 1962"). Null = hide entirely. */
  tagline: string | null
  /** Pre-formatted location display (e.g. "HOLE 7"). Always non-empty. */
  locationDisplay: string
  /** Masthead subhead under the section deck (e.g. "ON CART"). Null hides. */
  locationSubhead: string | null
  /** Raw venue value for the cart-screen location-question label. Null lets
   *  the chassis fall back to its own default phrasing (Editorial:
   *  "WHERE ARE YOU?"). */
  locationQuestionLabel: string | null
  /** Computed from venue.allow_pickup / allow_delivery. 'none' is invalid
   *  config but the chassis should render gracefully if seen. */
  fulfillmentMode: 'both' | 'delivery' | 'pickup' | 'none'
  /** Cart-screen submit CTA label. Always non-empty (DB has NOT NULL DEFAULT). */
  submitCtaLabel: string
  /** Confirm-screen big headline. Always non-empty (DB has NOT NULL DEFAULT). */
  successHeadline: string
  /** Confirm-screen body sentence. Null lets chassis fall back to its own
   *  generic phrasing. */
  fulfillmentCopy: string | null
  /** Confirm-screen ETA tail. Null = hide entirely. */
  etaMinutes: number | null
  /** Drives the receipt closing line on the confirm screen. */
  billingState: BillingState
}

/** Callbacks the shell exposes to chassis components. All synchronous except
 *  onSubmit, which kicks off the payment-or-order flow. */
export type ChassisActions = {
  // ── Menu screen ──
  /** Increment quantity for an item with no modifiers (cartKey = "id|"). */
  onAddSimple(itemId: string): void
  onRemoveSimple(itemId: string): void
  /** For items WITH modifiers — navigate to the item screen. */
  onOpenItem(itemId: string): void
  /** Navigate to cart review. Chassis should also surface the current item
   *  count near this CTA. */
  onProceedToReview(): void

  // ── Item screen ──
  /** Add a configured item (qty + selected modifiers) to the cart and
   *  return to menu. */
  onConfirmItem(qty: number, mods: SelectedModifier[]): void
  /** Cancel the item screen without adding anything. */
  onCancelItem(): void

  // ── Cart screen ──
  /** Adjust a cart line directly. qty <= 0 removes the line. */
  onUpdateCartEntry(cartKey: string, qty: number): void
  onChangeFulfillment(mode: FulfillmentType): void
  onChangeCustomerId(v: string): void
  onChangeNotes(v: string): void
  onChangeDeliveryLocation(v: string): void
  /** Submit the order. Stripe-enabled venues redirect; otherwise transitions
   *  to the confirm screen on success or sets state.error on failure. */
  onSubmit(): Promise<void>

  // ── Confirm screen ──
  /** Reset cart and return to menu. */
  onPlaceAnother(): void

  // ── Generic ──
  onBack(): void
}

/** The complete shape every chassis is handed. */
export type ChassisProps = {
  venue: Venue
  location: Location
  menuItems: RequestWithModifiers[]
  config: ChassisConfig
  state: OrderState
  actions: ChassisActions
}
