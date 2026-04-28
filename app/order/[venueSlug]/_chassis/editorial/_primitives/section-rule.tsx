'use client'

import { EDITORIAL_TOKENS as T } from '../tokens'

/** The chassis's section break: a 1px ink rule on top, a 12px gap holding
 *  the section deck (italic title left, tracked sans subhead right), then
 *  a 0.5px hairline on bottom. Used above the menu list, the modifier
 *  list, and the cart items list. */
export function SectionRule({
  title,
  subhead,
}: {
  title: React.ReactNode
  subhead?: React.ReactNode
}) {
  return (
    <>
      <div style={{ height: 1, background: T.ink, opacity: 0.85 }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '12px 0 8px',
        }}
      >
        <div
          style={{
            fontFamily: T.serifDisplay,
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 400,
            color: T.ink,
          }}
        >
          {title}
        </div>
        {subhead != null && (
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 9.5,
              letterSpacing: 2.4,
              fontWeight: 600,
              color: T.muted,
            }}
          >
            {subhead}
          </div>
        )}
      </div>
      <div style={{ height: 0.5, background: T.rule }} />
    </>
  )
}
