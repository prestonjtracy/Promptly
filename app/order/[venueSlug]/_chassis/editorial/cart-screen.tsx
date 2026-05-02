'use client'

import type { ChassisProps } from '../../_shell/chassis-types'
import { EDITORIAL_TOKENS as T } from './tokens'
import { Folio } from './_primitives/folio'
import { SectionRule } from './_primitives/section-rule'
import { EditorialField } from './_primitives/field'
import { EditorialCTA } from './_primitives/editorial-cta'
import { formatDisplayName } from './format'

/** Screen 03 — back-nav folio → "Review & send." display → cart line items
 *  with rolled-up modifier mentions → fulfillment toggle (only when 'both')
 *  → fields (customer id, location for delivery, notes) → sticky submit
 *  CTA. The chassis applies its own fallback for the location-question
 *  label when venue.location_question_label is null. */
const FALLBACK_LOCATION_QUESTION = 'WHERE ARE YOU?'

export function EditorialCartScreen(props: ChassisProps) {
  const { venue, location, menuItems, config, state, actions } = props

  const itemMap = new Map(menuItems.map((m) => [m.id, m]))
  const lines = state.cart.map((entry) => {
    const item = itemMap.get(entry.menuItemId)
    const unit =
      (item?.price ?? 0) +
      entry.selectedModifiers
        .filter((m) => m.modifier_type !== 'remove')
        .reduce((s, m) => s + m.price_adjustment, 0)
    return {
      cartKey: entry.cartKey,
      qty: entry.quantity,
      name: formatDisplayName(item?.name ?? 'Unknown item'),
      mods: entry.selectedModifiers.map((m) =>
        m.modifier_type === 'remove'
          ? `No ${formatDisplayName(m.option_name)}`
          : formatDisplayName(m.option_name),
      ),
      lineTotal: unit * entry.quantity,
      hasPrice: item?.price !== null && item?.price !== undefined,
    }
  })
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const itemCount = lines.reduce((s, l) => s + l.qty, 0)
  const anyPriced = venue.show_prices && lines.some((l) => l.hasPrice)

  const customerLabel = venue.customer_id_label
  const showFulfillmentToggle = config.fulfillmentMode === 'both'
  const collectsDelivery =
    config.fulfillmentMode === 'delivery' ||
    (config.fulfillmentMode === 'both' && state.fulfillment === 'delivery')

  const locationQuestion =
    config.locationQuestionLabel?.trim().toUpperCase() || FALLBACK_LOCATION_QUESTION

  const ctaMeta = anyPriced
    ? `$${subtotal.toFixed(2)} · ${itemCount} ITEM${itemCount !== 1 ? 'S' : ''}`
    : `${itemCount} ITEM${itemCount !== 1 ? 'S' : ''}`

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        background: T.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Folio
        left={config.locationDisplay.toUpperCase()}
        right="No. 03 / Review"
        onBack={actions.onBack}
      />

      <div style={{ paddingBottom: 130 }}>
        {/* Section head */}
        <div style={{ padding: '24px 28px 0' }}>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 9.5,
              letterSpacing: 2.6,
              fontWeight: 600,
              color: T.muted,
              marginBottom: 8,
            }}
          >
            YOUR ORDER · {location.name.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: T.serifDisplay,
              fontWeight: 400,
              fontSize: 32,
              lineHeight: 1.0,
              color: T.ink,
              letterSpacing: -0.5,
            }}
          >
            Review &<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>send.</em>
          </div>
        </div>

        {/* Items list */}
        <div style={{ padding: '24px 28px 0' }}>
          <SectionRule
            title="From the cart"
            subhead={`${itemCount} ITEM${itemCount !== 1 ? 'S' : ''}`}
          />

          {lines.map((line, idx) => (
            <div
              key={line.cartKey}
              style={{
                padding: '16px 0',
                borderBottom:
                  idx === lines.length - 1 ? 'none' : `0.5px solid ${T.rule}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: T.serifDisplay,
                  fontSize: 16,
                  color: T.ink,
                  fontVariantNumeric: 'oldstyle-nums',
                  fontStyle: 'italic',
                  fontWeight: 300,
                  paddingTop: 1,
                  minWidth: 16,
                }}
              >
                ×{line.qty}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div
                    style={{
                      fontFamily: T.serifDisplay,
                      fontSize: 18,
                      color: T.ink,
                      fontWeight: 400,
                      letterSpacing: -0.1,
                      lineHeight: 1.15,
                    }}
                  >
                    {line.name}
                  </div>
                  {venue.show_prices && line.hasPrice && (
                    <div
                      style={{
                        fontFamily: T.serif,
                        fontSize: 13,
                        color: T.ink,
                        fontVariantNumeric: 'oldstyle-nums',
                      }}
                    >
                      ${line.lineTotal.toFixed(2)}
                    </div>
                  )}
                </div>
                {line.mods.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: T.serif,
                      fontSize: 12.5,
                      color: T.muted,
                      fontStyle: 'italic',
                      fontWeight: 300,
                      marginTop: 3,
                      lineHeight: 1.35,
                    }}
                  >
                    — {m}
                  </div>
                ))}

                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => actions.onUpdateCartEntry(line.cartKey, line.qty - 1)}
                    style={miniButton(T.muted)}
                  >
                    {line.qty <= 1 ? 'REMOVE' : '−1'}
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.onUpdateCartEntry(line.cartKey, line.qty + 1)}
                    style={miniButton(T.muted)}
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          ))}

          {anyPriced && (
            <>
              <div style={{ height: 1, background: T.ink, opacity: 0.85, marginTop: 4 }} />
              <div
                style={{
                  padding: '12px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: T.sans,
                    fontSize: 9.5,
                    letterSpacing: 2.4,
                    fontWeight: 600,
                    color: T.muted,
                  }}
                >
                  SUBTOTAL
                </span>
                <span
                  style={{
                    fontFamily: T.serifDisplay,
                    fontSize: 22,
                    color: T.ink,
                    fontWeight: 400,
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  ${subtotal.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Mode toggle — only when both modes are offered */}
        {showFulfillmentToggle && (
          <div style={{ padding: '24px 28px 0' }}>
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 9.5,
                letterSpacing: 2.6,
                fontWeight: 600,
                color: T.muted,
                marginBottom: 10,
              }}
            >
              FULFILLMENT
            </div>
            <div
              style={{
                display: 'flex',
                border: `0.5px solid ${T.ink}`,
                borderRadius: 2,
              }}
            >
              {(
                [
                  { id: 'delivery' as const, label: 'Bring to me' },
                  { id: 'pickup' as const, label: 'I’ll come get it' },
                ]
              ).map((m, i) => {
                const active = state.fulfillment === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => actions.onChangeFulfillment(m.id)}
                    style={{
                      flex: 1,
                      height: 46,
                      padding: 0,
                      background: active ? T.ink : 'transparent',
                      color: active ? T.paper : T.ink,
                      border: 'none',
                      borderLeft: i === 0 ? 'none' : `0.5px solid ${T.ink}`,
                      fontFamily: T.serifDisplay,
                      fontSize: 15,
                      fontWeight: 400,
                      fontStyle: 'italic',
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Fields */}
        <div style={{ padding: '8px 28px 0' }}>
          {customerLabel && (
            <EditorialField
              label={customerLabel}
              value={state.customerIdValue}
              onChange={actions.onChangeCustomerId}
              placeholder=""
              optional={!venue.customer_id_required}
            />
          )}
          {collectsDelivery && (
            <EditorialField
              label={locationQuestion}
              value={state.deliveryLocation}
              onChange={actions.onChangeDeliveryLocation}
              placeholder={venue.delivery_location_placeholder ?? ''}
              optional={!venue.delivery_location_required}
            />
          )}
          {venue.allow_notes && (
            <EditorialField
              label="Special instructions"
              value={state.notes}
              onChange={actions.onChangeNotes}
              placeholder="Anything we should know?"
              optional
              multi
            />
          )}
        </div>

        {state.error && (
          <div style={{ padding: '12px 28px 0' }}>
            <div
              style={{
                padding: '12px 14px',
                background: T.paperDeep,
                borderLeft: `2px solid ${T.ink}`,
                fontFamily: T.serif,
                fontStyle: 'italic',
                fontSize: 13,
                color: T.inkSoft,
                fontWeight: 300,
              }}
            >
              {state.error}
            </div>
          </div>
        )}
      </div>

      <EditorialCTA
        label={state.isPending ? 'Sending…' : config.submitCtaLabel}
        rightMeta={ctaMeta}
        onClick={actions.onSubmit}
        disabled={state.isPending || itemCount === 0}
        accent={venue.primary_color}
      />
    </div>
  )
}

function miniButton(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontFamily: 'var(--font-inter), Inter, sans-serif',
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: 600,
    color,
    cursor: 'pointer',
    textTransform: 'uppercase',
  }
}
