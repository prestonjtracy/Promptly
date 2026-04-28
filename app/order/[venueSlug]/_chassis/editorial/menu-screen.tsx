'use client'

import type { ChassisProps } from '../../_shell/chassis-types'
import { EDITORIAL_TOKENS as T } from './tokens'
import { EditorialMasthead } from './masthead'
import { SectionRule } from './_primitives/section-rule'
import { EditorialCTA } from './_primitives/editorial-cta'
import { EditorialStepper } from './_primitives/stepper'

/** Screen 01 — masthead → category section → numbered item list → sticky
 *  Review CTA. Items WITHOUT modifiers add inline via the stepper; items
 *  WITH modifiers route to the item screen for configuration. */
export function EditorialMenuScreen({
  venue,
  menuItems,
  config,
  state,
  actions,
}: ChassisProps) {
  const totalQty = state.cart.reduce((s, e) => s + e.quantity, 0)

  // Editorial wants ONE section per screen — group items by menu_category
  // and render each category as its own SectionRule + list. Uncategorized
  // items collect into a tail "Other" section so nothing goes missing.
  type Bucket = { key: string; title: string; sort: number; items: typeof menuItems }
  const buckets = new Map<string, Bucket>()
  for (const item of menuItems) {
    const cat = item.category
    const key = cat?.id ?? '__none__'
    const bucket = buckets.get(key) ?? {
      key,
      title: cat?.name ?? 'Other',
      sort: cat?.sort_order ?? Number.MAX_SAFE_INTEGER,
      items: [],
    }
    bucket.items.push(item)
    buckets.set(key, bucket)
  }
  const sortedBuckets = Array.from(buckets.values()).sort((a, b) => a.sort - b.sort)

  const totalForItem = (itemId: string) =>
    state.cart.filter((e) => e.menuItemId === itemId).reduce((s, e) => s + e.quantity, 0)

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EditorialMasthead
        venue={venue}
        tagline={config.tagline}
        locationDisplay={config.locationDisplay}
      />

      <div style={{ paddingBottom: 120 }}>
        {sortedBuckets.map((bucket, i) => (
          <section key={bucket.key} style={{ padding: i === 0 ? '28px 28px 0' : '36px 28px 0' }}>
            <SectionRule
              title={bucket.title}
              subhead={
                config.locationSubhead
                  ? `${bucket.items.length} · ${config.locationSubhead}`
                  : `${bucket.items.length} ITEM${bucket.items.length !== 1 ? 'S' : ''}`
              }
            />
            <div>
              {bucket.items.map((it, idx) => {
                const hasMods = it.modifier_groups.length > 0
                const itemTotal = totalForItem(it.id)
                return (
                  <article
                    key={it.id}
                    style={{
                      padding: '18px 0',
                      borderBottom:
                        idx === bucket.items.length - 1 ? 'none' : `0.5px solid ${T.rule}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.serif,
                        fontSize: 11,
                        color: T.muted,
                        fontVariantNumeric: 'oldstyle-nums',
                        paddingTop: 5,
                        minWidth: 16,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div
                          style={{
                            fontFamily: T.serifDisplay,
                            fontSize: 19,
                            color: T.ink,
                            fontWeight: 400,
                            letterSpacing: -0.1,
                            lineHeight: 1.15,
                          }}
                        >
                          {it.name}
                        </div>
                        {it.price !== null && (
                          <div
                            style={{
                              fontFamily: T.serif,
                              fontSize: 14,
                              color: T.ink,
                              fontVariantNumeric: 'oldstyle-nums',
                              paddingTop: 4,
                            }}
                          >
                            ${it.price.toFixed(2)}
                          </div>
                        )}
                      </div>
                      {it.description && (
                        <div
                          style={{
                            fontFamily: T.serif,
                            fontSize: 13,
                            color: T.muted,
                            marginTop: 4,
                            lineHeight: 1.45,
                            fontStyle: 'italic',
                            fontWeight: 300,
                          }}
                        >
                          {it.description}
                        </div>
                      )}

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        {hasMods ? (
                          <button
                            type="button"
                            onClick={() => actions.onOpenItem(it.id)}
                            style={addButton(T.ink)}
                          >
                            {itemTotal > 0
                              ? `IN ORDER · ${itemTotal} · ADD ANOTHER`
                              : 'ADD TO ORDER'}
                          </button>
                        ) : itemTotal === 0 ? (
                          <button
                            type="button"
                            onClick={() => actions.onAddSimple(it.id)}
                            style={addButton(T.ink)}
                          >
                            ADD TO ORDER
                          </button>
                        ) : (
                          <EditorialStepper
                            qty={itemTotal}
                            onDec={() => actions.onRemoveSimple(it.id)}
                            onInc={() => actions.onAddSimple(it.id)}
                            variant="inline"
                          />
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}

        {sortedBuckets.length === 0 && (
          <div
            style={{
              padding: '64px 28px',
              textAlign: 'center',
              fontFamily: T.serif,
              fontSize: 15,
              fontStyle: 'italic',
              fontWeight: 300,
              color: T.muted,
            }}
          >
            Nothing on offer just now.
          </div>
        )}
      </div>

      {totalQty > 0 && (
        <EditorialCTA
          label={`Review ${totalQty} item${totalQty !== 1 ? 's' : ''}`}
          rightMeta={`${totalQty} ITEM${totalQty !== 1 ? 'S' : ''}`}
          onClick={actions.onProceedToReview}
          accent={venue.primary_color}
        />
      )}
    </div>
  )
}

function addButton(ink: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontFamily: 'var(--font-inter), Inter, sans-serif',
    fontSize: 10,
    letterSpacing: 2.6,
    fontWeight: 600,
    color: ink,
    cursor: 'pointer',
    borderBottom: `1px solid ${ink}`,
    paddingBottom: 2,
  }
}
