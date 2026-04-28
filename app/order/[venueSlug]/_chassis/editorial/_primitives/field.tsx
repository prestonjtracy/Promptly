'use client'

import { EDITORIAL_TOKENS as T } from '../tokens'

/** Cart-screen form field. Tracked-caps label up top, optional "optional"
 *  italic hint right-aligned, value styled as text-serif italic when empty
 *  / upright when filled. Hairline divider below, 16px vertical padding so
 *  fields stack into a single column. Multi-line variant becomes a textarea
 *  with the same type rules. */
export function EditorialField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  helper,
  multi,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  optional?: boolean
  helper?: string
  multi?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    marginTop: 8,
    padding: 0,
    border: 'none',
    background: 'transparent',
    fontFamily: T.serif,
    color: T.ink,
    fontStyle: value ? 'normal' : 'italic',
    fontWeight: value ? 400 : 300,
    outline: 'none',
    fontVariantNumeric: 'oldstyle-nums',
  }

  return (
    <div style={{ padding: '16px 0', borderBottom: `0.5px solid ${T.rule}` }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div
          style={{
            fontFamily: T.sans,
            fontSize: 9.5,
            letterSpacing: 2.4,
            fontWeight: 600,
            color: T.muted,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        {optional && (
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 11,
              fontStyle: 'italic',
              color: T.mutedSoft,
              fontWeight: 300,
            }}
          >
            optional
          </div>
        )}
      </div>
      {multi ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={{ ...inputStyle, fontSize: 15, resize: 'none' }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          style={{ ...inputStyle, fontSize: 17 }}
        />
      )}
      {helper && (
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 11.5,
            fontStyle: 'italic',
            color: T.mutedSoft,
            fontWeight: 300,
            marginTop: 4,
          }}
        >
          {helper}
        </div>
      )}
    </div>
  )
}
