'use client'

import { EDITORIAL_TOKENS as T } from './tokens'
import type { Venue } from '@/lib/supabase/types'

/** Editorial masthead — optional logo image, venue name with the last word
 *  italicized, and a magazine-style two-corner subtitle row.
 *
 *  Subtitle layout: left corner = tagline (e.g. "EST. 1962"); right corner =
 *  the location, formatted as `locationSubhead + locationCode` when
 *  locationSubhead is set ("ON CART 4"), otherwise the standalone
 *  locationDisplay ("CART 4"). Each corner collapses cleanly when its
 *  source is null:
 *
 *    tagline=null, locationSubhead=null  →  right corner = "CART 4"
 *    tagline=set,  locationSubhead=null  →  "EST. 1962"  ←→  "CART 4"
 *    tagline=null, locationSubhead=set   →  empty        ←→  "ON CART 4"
 *    tagline=set,  locationSubhead=set   →  "EST. 1962"  ←→  "ON CART 4"
 *
 *  When all three are absent the row disappears entirely. */
export function EditorialMasthead({
  venue,
  tagline,
  locationDisplay,
  locationCode,
  locationSubhead,
}: {
  venue: Venue
  tagline: string | null
  locationDisplay: string
  locationCode: string
  locationSubhead: string | null
}) {
  // Venue name treatment: stack the last word on its own line in italic 300.
  // For single-word venue names we just italicize the whole thing — no stack.
  const nameParts = venue.name.trim().split(/\s+/)
  const head = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
  const tail = nameParts.slice(-1)[0]

  const leftCorner = tagline?.trim() || ''
  const trimmedSubhead = locationSubhead?.trim()
  const rightCorner = trimmedSubhead
    ? `${trimmedSubhead.toUpperCase()} ${locationCode.toUpperCase()}`
    : locationDisplay.trim().toUpperCase()
  const showSubtitleRow = leftCorner !== '' || rightCorner !== ''

  const microCapStyle: React.CSSProperties = {
    fontFamily: T.sans,
    fontSize: 9.5,
    letterSpacing: 2.6,
    color: T.muted,
    fontWeight: 600,
  }

  return (
    <div style={{ padding: '32px 28px 0', textAlign: 'center' }}>
      {venue.logo_url ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={venue.logo_url}
            alt={`${venue.name} logo`}
            style={{ height: 62, width: 62, objectFit: 'contain' }}
          />
        </div>
      ) : null}

      <div
        style={{
          fontFamily: T.serifDisplay,
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1.05,
          color: T.ink,
          letterSpacing: -0.4,
        }}
      >
        {head && (
          <>
            {head}
            <br />
          </>
        )}
        <em style={{ fontStyle: 'italic', fontWeight: 300 }}>{tail}</em>
      </div>

      {showSubtitleRow && (
        // Two spans with `space-between` push each corner to its end. When
        // the left side is empty, the right corner stays right-aligned —
        // exactly what we want for the location-only case. text-align:
        // 'center' from the parent doesn't apply inside a flex container.
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={microCapStyle}>{leftCorner}</span>
          <span style={microCapStyle}>{rightCorner}</span>
        </div>
      )}
    </div>
  )
}
