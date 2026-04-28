'use client'

import { EDITORIAL_TOKENS as T } from '../tokens'

/** Sticky bottom CTA. Italic display label left, tracked-out micro-caps
 *  metadata right (e.g. "$19.00 · 4 ITEMS"). Color uses the venue accent
 *  — the only place the venue color appears in the bottom half of any
 *  Editorial screen. The wrapper provides the paper→transparent gradient
 *  scrim so content above can scroll under it. */
export function EditorialCTA({
  label,
  rightMeta,
  onClick,
  disabled,
  accent,
}: {
  label: string
  rightMeta?: string
  onClick: () => void
  disabled?: boolean
  accent: string
}) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px 28px max(38px, env(safe-area-inset-bottom))',
        background: `linear-gradient(to top, ${T.paper} 70%, rgba(251,250,246,0))`,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '100%',
          height: 56,
          border: 'none',
          background: accent,
          color: '#fff',
          fontFamily: T.serifDisplay,
          fontSize: 17,
          fontWeight: 400,
          letterSpacing: 0.2,
          display: 'flex',
          justifyContent: rightMeta ? 'space-between' : 'center',
          alignItems: 'center',
          padding: '0 22px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          borderRadius: 2,
        }}
      >
        <span style={{ fontStyle: 'italic' }}>{label}</span>
        {rightMeta && (
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 10,
              letterSpacing: 2.4,
              fontWeight: 600,
              opacity: 0.9,
            }}
          >
            {rightMeta}
          </span>
        )}
      </button>
    </div>
  )
}
