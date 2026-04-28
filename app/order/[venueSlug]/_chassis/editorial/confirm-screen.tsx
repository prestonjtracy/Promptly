'use client'

import type { ChassisProps } from '../../_shell/chassis-types'
import { EDITORIAL_TOKENS as T } from './tokens'

const FALLBACK_FULFILLMENT_COPY = 'Your order has been received and is being prepared.'

/** Screen 04 — folio with order number → hairline circle ornament with
 *  accent-color check → magazine pull-quote headline (split-italic last
 *  word) → italic body sentence with optional ETA tail → "the receipt"
 *  panel as a clipped column → secondary "ORDER SOMETHING ELSE" link.
 *
 *  Receipt closing line switches on venue.billing_state:
 *    house_account → "CHARGED TO {customer_id_value}" + total
 *    tab           → "TAB FOR {customer_id_value}" + total
 *    paid          → "PAID" + total
 *    complimentary → tracked-caps item count + italic "complimentary"
 */
export function EditorialConfirmScreen(props: ChassisProps) {
  const { venue, menuItems, config, state, actions } = props

  const itemMap = new Map(menuItems.map((m) => [m.id, m]))
  const lines = state.cart.map((entry) => {
    const item = itemMap.get(entry.menuItemId)
    const unit =
      (item?.price ?? 0) +
      entry.selectedModifiers
        .filter((m) => m.modifier_type !== 'remove')
        .reduce((s, m) => s + m.price_adjustment, 0)
    const modSummary = entry.selectedModifiers.length
      ? ' — ' +
        entry.selectedModifiers
          .map((m) => (m.modifier_type === 'remove' ? `no ${m.option_name}` : m.option_name))
          .join(', ')
      : ''
    return {
      cartKey: entry.cartKey,
      qty: entry.quantity,
      label: `${item?.name ?? 'Item'}${modSummary}`,
      lineTotal: unit * entry.quantity,
      hasPrice: item?.price !== null && item?.price !== undefined,
    }
  })
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const itemCount = lines.reduce((s, l) => s + l.qty, 0)
  const anyPriced = lines.some((l) => l.hasPrice)

  // Stack the headline's last word into italic 300 — chassis signature.
  const headlineParts = config.successHeadline.trim().split(/\s+/)
  const headlineHead =
    headlineParts.length > 1 ? headlineParts.slice(0, -1).join(' ') : ''
  const headlineTail = headlineParts.slice(-1)[0]

  const bodySentence = config.fulfillmentCopy?.trim() || FALLBACK_FULFILLMENT_COPY

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Folio */}
      <div
        style={{
          padding: '6px 28px 0',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: T.sans,
          fontSize: 9.5,
          letterSpacing: 2.4,
          fontWeight: 600,
          color: T.muted,
          textTransform: 'uppercase',
        }}
      >
        <span>No. 04 / Confirmed</span>
        {state.orderNumber !== undefined && <span>Order #{state.orderNumber}</span>}
      </div>

      {/* Hero — magazine pull-quote treatment */}
      <div style={{ padding: '64px 28px 0', textAlign: 'center' }}>
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: '50%',
            margin: '0 auto',
            border: `0.75px solid ${T.ink}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 6,
              borderRadius: '50%',
              border: `0.5px solid ${T.rule}`,
            }}
          />
          <svg width="32" height="22" viewBox="0 0 32 22">
            <path
              d="M2 11 L 11 19 L 30 3"
              fill="none"
              stroke={venue.primary_color}
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div
          style={{
            marginTop: 32,
            fontFamily: T.sans,
            fontSize: 9.5,
            letterSpacing: 2.6,
            fontWeight: 600,
            color: T.muted,
          }}
        >
          YOUR ORDER IS
        </div>

        <div
          style={{
            marginTop: 12,
            fontFamily: T.serifDisplay,
            fontWeight: 400,
            fontSize: 56,
            lineHeight: 0.95,
            color: T.ink,
            letterSpacing: -1.5,
          }}
        >
          {headlineHead && (
            <>
              {headlineHead}
              <br />
            </>
          )}
          <em style={{ fontStyle: 'italic', fontWeight: 300 }}>{headlineTail}</em>
        </div>

        <div
          style={{
            marginTop: 24,
            fontFamily: T.serif,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 16,
            lineHeight: 1.5,
            color: T.inkSoft,
            maxWidth: 320,
            margin: '24px auto 0',
          }}
        >
          {bodySentence}
          {config.etaMinutes != null && (
            <>
              {' '}
              Estimated arrival in{' '}
              <span
                style={{
                  fontStyle: 'normal',
                  fontVariantNumeric: 'oldstyle-nums',
                  color: T.ink,
                }}
              >
                {config.etaMinutes} minute{config.etaMinutes === 1 ? '' : 's'}
              </span>
              .
            </>
          )}
        </div>
      </div>

      {/* Receipt — the clipped column */}
      {lines.length > 0 && (
        <div style={{ padding: '40px 28px 0' }}>
          <div style={{ height: 1, background: T.ink, opacity: 0.85 }} />
          <div
            style={{
              padding: '12px 0 4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <div
              style={{
                fontFamily: T.serifDisplay,
                fontStyle: 'italic',
                fontSize: 16,
                fontWeight: 400,
                color: T.ink,
              }}
            >
              The receipt
            </div>
          </div>
          <div style={{ height: 0.5, background: T.rule }} />

          {lines.map((line, i, arr) => (
            <div
              key={line.cartKey}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom:
                  i === arr.length - 1 ? 'none' : `0.5px solid ${T.rule}`,
                fontFamily: T.serif,
                fontSize: 13.5,
                color: T.inkSoft,
                fontWeight: 300,
              }}
            >
              <span>
                <span style={{ fontVariantNumeric: 'oldstyle-nums', color: T.ink }}>
                  ×{line.qty}
                </span>
                &nbsp;&nbsp;
                {line.label}
              </span>
              {line.hasPrice && (
                <span style={{ fontVariantNumeric: 'oldstyle-nums', color: T.ink }}>
                  ${line.lineTotal.toFixed(2)}
                </span>
              )}
            </div>
          ))}

          <div style={{ height: 1, background: T.ink, opacity: 0.85 }} />
          <ReceiptClosingLine
            billingState={config.billingState}
            customerIdValue={state.customerIdValue}
            itemCount={itemCount}
            subtotal={subtotal}
            anyPriced={anyPriced}
          />
        </div>
      )}

      {/* Bottom row — secondary action */}
      <div
        style={{
          marginTop: 'auto',
          padding: '40px 28px max(38px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={actions.onPlaceAnother}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontFamily: T.sans,
              fontSize: 10,
              letterSpacing: 2.6,
              fontWeight: 600,
              color: T.ink,
              cursor: 'pointer',
              borderBottom: `1px solid ${T.ink}`,
              paddingBottom: 2,
            }}
          >
            ORDER SOMETHING ELSE
          </button>
        </div>
      </div>
    </div>
  )
}

function ReceiptClosingLine({
  billingState,
  customerIdValue,
  itemCount,
  subtotal,
  anyPriced,
}: {
  billingState: ChassisProps['config']['billingState']
  customerIdValue: string
  itemCount: number
  subtotal: number
  anyPriced: boolean
}) {
  const labelStyle: React.CSSProperties = {
    fontFamily: T.sans,
    fontSize: 9.5,
    letterSpacing: 2.4,
    fontWeight: 600,
    color: T.muted,
  }
  const totalStyle: React.CSSProperties = {
    fontFamily: T.serifDisplay,
    fontSize: 22,
    color: T.ink,
    fontWeight: 400,
    fontVariantNumeric: 'oldstyle-nums',
  }

  if (billingState === 'complimentary' || !anyPriced) {
    return (
      <div
        style={{
          padding: '12px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={labelStyle}>
          {itemCount} ITEM{itemCount !== 1 ? 'S' : ''}
        </span>
        <span
          style={{
            fontFamily: T.serifDisplay,
            fontStyle: 'italic',
            fontSize: 18,
            color: T.muted,
            fontWeight: 300,
          }}
        >
          complimentary
        </span>
      </div>
    )
  }

  let leftText: string
  if (billingState === 'house_account') {
    leftText = customerIdValue
      ? `CHARGED TO ${customerIdValue.toUpperCase()}`
      : 'CHARGED TO HOUSE ACCOUNT'
  } else if (billingState === 'tab') {
    leftText = customerIdValue ? `TAB FOR ${customerIdValue.toUpperCase()}` : 'OPEN TAB'
  } else {
    // 'paid' — Stripe-charged, no customer-id rendering
    leftText = 'PAID'
  }

  return (
    <div
      style={{
        padding: '12px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span style={labelStyle}>{leftText}</span>
      <span style={totalStyle}>${subtotal.toFixed(2)}</span>
    </div>
  )
}
