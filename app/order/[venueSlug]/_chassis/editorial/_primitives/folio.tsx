'use client'

import { EDITORIAL_TOKENS as T } from '../tokens'

/** Magazine-style folio strip — tracked-out micro caps top of every screen.
 *  Optional left-side back affordance rendered as ‹ + label. */
export function Folio({
  left,
  right,
  onBack,
}: {
  left: string
  right: string
  onBack?: () => void
}) {
  const baseStyle: React.CSSProperties = {
    padding: '6px 28px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: T.sans,
    fontSize: 9.5,
    letterSpacing: 2.4,
    fontWeight: 600,
    color: T.muted,
    textTransform: 'uppercase',
  }

  return (
    <div style={baseStyle}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: T.muted,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            font: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14, letterSpacing: 0 }}>‹</span>
          {left}
        </button>
      ) : (
        <span>{left}</span>
      )}
      <span>{right}</span>
    </div>
  )
}
