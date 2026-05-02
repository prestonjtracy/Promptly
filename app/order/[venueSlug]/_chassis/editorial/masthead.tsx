'use client'

import { EDITORIAL_TOKENS as T } from './tokens'
import type { Venue } from '@/lib/supabase/types'
import { formatEditorialLocationMeta } from './format'

/** Editorial masthead — optional compact logo image, venue name with the last
 *  word italicized, and a centered metadata line.
 *
 *  Metadata layout: tagline and location collapse into a single centered
 *  line, e.g. "EST. 1930 · CART 04". */
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

  const leftMeta = tagline?.trim() || ''
  const rightMeta = formatEditorialLocationMeta({
    locationDisplay,
    locationCode,
    locationSubhead,
  })
  const metadata = [leftMeta, rightMeta].filter(Boolean).join(' · ')

  const microCapStyle: React.CSSProperties = {
    fontFamily: T.sans,
    fontSize: 9.5,
    letterSpacing: 2.6,
    color: T.muted,
    fontWeight: 600,
  }

  return (
    <div style={{ padding: '14px 24px 0', textAlign: 'center' }}>
      {venue.logo_url ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={venue.logo_url}
            alt={`${venue.name} logo`}
            style={{
              height: 44,
              width: 72,
              maxWidth: '24vw',
              objectFit: 'contain',
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          fontFamily: T.serifDisplay,
          fontWeight: 400,
          fontSize: 28,
          lineHeight: 1.05,
          color: T.ink,
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

      {metadata && (
        <div style={{ ...microCapStyle, marginTop: 11 }}>
          {metadata}
        </div>
      )}
    </div>
  )
}
