'use client'

import { useState } from 'react'
import type { ChassisProps } from '../../_shell/chassis-types'
import type { RequestWithModifiers, SelectedModifier } from '@/lib/supabase/types'
import { EDITORIAL_TOKENS as T } from './tokens'
import { Folio } from './_primitives/folio'
import { SectionRule } from './_primitives/section-rule'
import { EditorialStepper } from './_primitives/stepper'
import { formatDisplayName } from './format'

/** Screen 02 — back-nav folio → display title → italic description →
 *  one section per modifier_group → "Special instruction" aside →
 *  sticky qty stepper + Add CTA. Selected modifier set is local to this
 *  screen; on confirm we hand the chosen mods + qty to the shell, which
 *  merges them into the cart and returns us to the menu. */
export function EditorialItemScreen({
  venue,
  menuItems,
  state,
  actions,
}: ChassisProps) {
  const item = menuItems.find((m) => m.id === state.activeItemId)

  // The shell shouldn't route to 'item' without a valid activeItemId, but
  // be defensive — if we got here without one, gracefully bail to menu.
  if (!item) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          width: '100%',
          maxWidth: 430,
          margin: '0 auto',
          background: T.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          fontFamily: T.serif,
          fontStyle: 'italic',
          color: T.muted,
        }}
      >
        <button
          type="button"
          onClick={actions.onCancelItem}
          style={{
            background: 'transparent',
            border: `0.5px solid ${T.ink}`,
            padding: '12px 18px',
            color: T.ink,
            fontFamily: T.sans,
            fontSize: 10,
            letterSpacing: 2.4,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          BACK TO MENU
        </button>
      </div>
    )
  }

  return <ItemScreenBody venue={venue} item={item} actions={actions} />
}

function ItemScreenBody({
  venue,
  item,
  actions,
}: {
  venue: ChassisProps['venue']
  item: RequestWithModifiers
  actions: ChassisProps['actions']
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)

  const toggle = (optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) next.delete(optionId)
      else next.add(optionId)
      return next
    })
  }

  const modifierTotal = item.modifier_groups.reduce((sum, g) => {
    return (
      sum +
      g.options
        .filter((o) => selected.has(o.id))
        .reduce((s, o) => s + (o.modifier_type === 'remove' ? 0 : o.price_adjustment), 0)
    )
  }, 0)
  const unitPrice = (item.price ?? 0) + modifierTotal
  const lineTotal = unitPrice * qty
  const showPrices = venue.show_prices

  // Stack the last word of the title on its own line in italic 300 — the
  // chassis's signature display treatment.
  const displayName = formatDisplayName(item.name)
  const titleParts = displayName.trim().split(/\s+/)
  const titleHead = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : ''
  const titleTail = titleParts.slice(-1)[0]

  const handleAdd = () => {
    const mods: SelectedModifier[] = []
    for (const group of item.modifier_groups) {
      for (const option of group.options) {
        if (selected.has(option.id)) {
          mods.push({
            option_id: option.id,
            group_name: group.name,
            option_name: option.name,
            modifier_type: option.modifier_type,
            price_adjustment: option.price_adjustment,
          })
        }
      }
    }
    actions.onConfirmItem(qty, mods)
  }

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
        left={item.category?.name?.toUpperCase() ?? 'MENU'}
        right="No. 02 / Item"
        onBack={actions.onCancelItem}
      />

      {/* Departmental head */}
      <div style={{ padding: '34px 28px 0' }}>
        <div
          style={{
            fontFamily: T.sans,
            fontSize: 9.5,
            letterSpacing: 2.6,
            fontWeight: 600,
            color: T.muted,
            marginBottom: 14,
          }}
        >
            FROM {formatDisplayName(item.category?.name ?? 'Menu').toUpperCase()} — N° 02
        </div>
        <div
          style={{
            fontFamily: T.serifDisplay,
            fontWeight: 400,
            fontSize: 38,
            lineHeight: 1.0,
            color: T.ink,
            letterSpacing: -0.6,
          }}
        >
          {titleHead && (
            <>
              {titleHead}
              <br />
            </>
          )}
          <em style={{ fontStyle: 'italic', fontWeight: 300 }}>{titleTail}</em>
        </div>
        {item.description && (
          <div
            style={{
              fontFamily: T.serif,
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 15,
              lineHeight: 1.5,
              color: T.inkSoft,
              marginTop: 14,
              maxWidth: 300,
            }}
          >
            {item.description}
          </div>
        )}
      </div>

      <div style={{ paddingBottom: 130 }}>
        {item.modifier_groups.map((group) => (
          <div key={group.id} style={{ padding: '24px 28px 0' }}>
            <SectionRule title={group.name} />
            <div>
              {group.options.map((opt, idx) => {
                const sel = selected.has(opt.id)
                const showsPrice =
                  showPrices && opt.modifier_type !== 'remove' && opt.price_adjustment > 0
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    style={{
                      padding: '15px 0',
                      borderBottom:
                        idx === group.options.length - 1 ? 'none' : `0.5px solid ${T.rule}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: `1px solid ${sel ? T.ink : T.rule}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {sel && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: venue.primary_color,
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: T.serifDisplay,
                          fontSize: 18,
                          color: T.ink,
                          fontWeight: 400,
                          letterSpacing: -0.1,
                        }}
                      >
                          {opt.modifier_type === 'remove'
                            ? `No ${formatDisplayName(opt.name)}`
                            : formatDisplayName(opt.name)}
                      </div>
                    </div>

                    {showPrices && (
                      <div
                        style={{
                          fontFamily: T.serif,
                          fontSize: 13,
                          color: showsPrice ? T.ink : T.mutedSoft,
                          fontVariantNumeric: 'oldstyle-nums',
                          fontStyle: showsPrice ? 'normal' : 'italic',
                          fontWeight: 300,
                        }}
                      >
                        {showsPrice ? `+ $${opt.price_adjustment.toFixed(2)}` : 'included'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky CTA — qty stepper paired with Add */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 24px calc(18px + env(safe-area-inset-bottom))',
          background: `linear-gradient(to top, ${T.paper} 76%, rgba(251,250,246,0))`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
          <EditorialStepper
            qty={qty}
            onDec={() => setQty(Math.max(1, qty - 1))}
            onInc={() => setQty(qty + 1)}
            variant="boxed"
          />
          <button
            type="button"
            onClick={handleAdd}
            style={{
              flex: 1,
              height: 56,
              border: 'none',
              background: venue.primary_color,
              color: '#fff',
              fontFamily: T.serifDisplay,
              fontSize: 17,
              fontWeight: 400,
              letterSpacing: 0.2,
              padding: '0 18px',
              display: 'flex',
              justifyContent: showPrices ? 'space-between' : 'center',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            <span style={{ fontStyle: 'italic' }}>Add to order</span>
            {showPrices && (
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 10,
                  letterSpacing: 2.4,
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                ${lineTotal.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
