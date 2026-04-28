'use client'

import { EDITORIAL_TOKENS as T } from '../tokens'

/** Quantity stepper. Two visual variants:
 *    - inline: hairline-circle minus / number / hairline-circle plus
 *      (used in the menu list next to each item once it has qty > 0)
 *    - boxed: thin-rule rectangle the same height as the CTA, designed to
 *      sit inline with the Add CTA on the item screen */
export function EditorialStepper({
  qty,
  onDec,
  onInc,
  variant = 'inline',
}: {
  qty: number
  onDec: () => void
  onInc: () => void
  variant?: 'inline' | 'boxed'
}) {
  if (variant === 'boxed') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          border: `0.5px solid ${T.ink}`,
          padding: '0 14px',
          height: 56,
          borderRadius: 2,
        }}
      >
        <button type="button" onClick={onDec} style={inlineBtn(T.ink)} aria-label="Decrease">
          —
        </button>
        <span
          style={{
            fontFamily: T.serifDisplay,
            fontSize: 18,
            color: T.ink,
            fontVariantNumeric: 'oldstyle-nums',
            minWidth: 12,
            textAlign: 'center',
          }}
        >
          {qty}
        </span>
        <button type="button" onClick={onInc} style={inlineBtn(T.ink)} aria-label="Increase">
          +
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button type="button" onClick={onDec} style={ringBtn(T.ink)} aria-label="Decrease">
        —
      </button>
      <span
        style={{
          fontFamily: T.serifDisplay,
          fontSize: 18,
          color: T.ink,
          fontVariantNumeric: 'oldstyle-nums',
          minWidth: 12,
          textAlign: 'center',
        }}
      >
        {qty}
      </span>
      <button type="button" onClick={onInc} style={ringBtn(T.ink)} aria-label="Increase">
        +
      </button>
    </div>
  )
}

function ringBtn(ink: string): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    border: `0.5px solid ${ink}`,
    background: 'transparent',
    borderRadius: '50%',
    fontFamily: 'Newsreader, Georgia, serif',
    fontSize: 14,
    color: ink,
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  }
}

function inlineBtn(ink: string): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    border: 'none',
    background: 'transparent',
    fontFamily: 'Newsreader, Georgia, serif',
    fontSize: 14,
    color: ink,
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  }
}
