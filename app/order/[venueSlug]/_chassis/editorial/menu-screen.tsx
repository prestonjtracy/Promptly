'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { ChassisProps } from '../../_shell/chassis-types'
import { EDITORIAL_TOKENS as T } from './tokens'
import { EditorialMasthead } from './masthead'
import { SectionRule } from './_primitives/section-rule'
import { EditorialCTA } from './_primitives/editorial-cta'
import { EditorialStepper } from './_primitives/stepper'
import { formatDisplayName } from './format'

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
  const sectionRefs = useRef(new Map<string, HTMLElement>())
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Editorial wants ONE section per screen — group items by menu_category
  // and render each category as its own SectionRule + list. Uncategorized
  // items collect into a tail "Other" section so nothing goes missing.
  type Bucket = { key: string; title: string; sort: number; items: typeof menuItems }
  const sortedBuckets = useMemo(() => {
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
    return Array.from(buckets.values()).sort((a, b) => a.sort - b.sort)
  }, [menuItems])

  useEffect(() => {
    if (sortedBuckets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const key = visible?.target.getAttribute('data-category-key')
        const bucket = sortedBuckets.find((b) => b.key === key)
        if (bucket) setActiveCategory(bucket.title)
      },
      { rootMargin: '-16% 0px -64% 0px', threshold: [0.1, 0.35, 0.6] },
    )

    for (const bucket of sortedBuckets) {
      const node = sectionRefs.current.get(bucket.key)
      if (node) observer.observe(node)
    }

    return () => observer.disconnect()
  }, [sortedBuckets])

  const totalForItem = (itemId: string) =>
    state.cart.filter((e) => e.menuItemId === itemId).reduce((s, e) => s + e.quantity, 0)
  const currentCategory = activeCategory ?? sortedBuckets[0]?.title ?? 'Menu'

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.paperDeep,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100dvh',
          margin: '0 auto',
          background: T.paper,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '10px 22px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: T.sans,
            fontSize: 9,
            letterSpacing: 2.35,
            fontWeight: 600,
            color: T.muted,
            textTransform: 'uppercase',
          }}
        >
          <span>NO. 04 — CART</span>
          <span>{formatDisplayName(currentCategory)}</span>
        </div>

        <EditorialMasthead
          venue={venue}
          tagline={config.tagline}
          locationDisplay={config.locationDisplay}
          locationCode={config.locationCode}
          locationSubhead={config.locationSubhead}
        />

        <div style={{ paddingBottom: 120 }}>
          {sortedBuckets.map((bucket, i) => (
            <section
              key={bucket.key}
              ref={(node) => {
                if (node) sectionRefs.current.set(bucket.key, node)
                else sectionRefs.current.delete(bucket.key)
              }}
              data-category-key={bucket.key}
              style={{ padding: i === 0 ? '22px 22px 0' : '30px 22px 0' }}
            >
              <SectionRule
                title={formatDisplayName(bucket.title)}
                subhead={totalQty > 0 ? `${totalQty} IN CART` : 'START ORDER'}
              />
              <div>
                {bucket.items.map((it, idx) => {
                const hasMods = it.modifier_groups.length > 0
                const itemTotal = totalForItem(it.id)
                const price = typeof it.price === 'number' ? it.price : null
                const showPrice = venue.show_prices && price !== null
                return (
                  <article
                    key={it.id}
                    style={{
                      padding: '15px 0 14px',
                      borderBottom:
                        idx === bucket.items.length - 1 ? 'none' : `0.5px solid ${T.rule}`,
                      display: 'grid',
                      gridTemplateColumns: '22px minmax(0, 1fr) minmax(104px, max-content)',
                      alignItems: 'stretch',
                      columnGap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.serif,
                        fontSize: 11,
                        color: T.muted,
                        fontVariantNumeric: 'oldstyle-nums',
                        paddingTop: 4,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: T.serifDisplay,
                          fontSize: 18.5,
                          color: T.ink,
                          fontWeight: 400,
                          lineHeight: 1.12,
                        }}
                      >
                        {formatDisplayName(it.name)}
                      </div>
                      {it.description && (
                        <div
                          style={{
                            fontFamily: T.serif,
                            fontSize: 12.5,
                            color: T.muted,
                            marginTop: 3,
                            lineHeight: 1.38,
                            fontStyle: 'italic',
                            fontWeight: 300,
                          }}
                        >
                          {it.description}
                        </div>
                      )}

                    </div>

                    <div
                      style={{
                        minHeight: 58,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: showPrice ? 'space-between' : 'flex-end',
                      }}
                    >
                      <div style={priceSlot}>
                        {showPrice ? `$${price.toFixed(2)}` : null}
                      </div>

                      {hasMods ? (
                        <button
                          type="button"
                          onClick={() => actions.onOpenItem(it.id)}
                          style={addButton(T.ink)}
                        >
                          {itemTotal > 0 ? `ADD TO ORDER · ${itemTotal}` : 'ADD TO ORDER'}
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
            label={config.submitCtaLabel}
            rightMeta={`${totalQty} ITEM${totalQty !== 1 ? 'S' : ''}`}
            onClick={actions.onProceedToReview}
            accent={venue.primary_color}
          />
        )}
      </div>
    </div>
  )
}

const priceSlot: CSSProperties = {
  minHeight: 18,
  fontFamily: T.serif,
  fontSize: 13.5,
  color: T.ink,
  fontVariantNumeric: 'oldstyle-nums',
  lineHeight: 1.2,
}

function addButton(ink: string): CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontFamily: 'var(--font-inter), Inter, sans-serif',
    fontSize: 9,
    letterSpacing: 1.55,
    fontWeight: 600,
    color: ink,
    cursor: 'pointer',
    borderBottom: `1px solid ${ink}`,
    paddingBottom: 3,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  }
}
