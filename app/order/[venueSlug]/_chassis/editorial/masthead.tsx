'use client'

import { EDITORIAL_TOKENS as T } from './tokens'
import type { Venue } from '@/lib/supabase/types'

/** Editorial masthead — large logo (or text wordmark fallback), venue name
 *  with the last word italicized, and a tracked-caps subtitle pairing the
 *  optional tagline with the formatted location display. When `tagline` is
 *  null the bullet separator is suppressed; when both are absent the whole
 *  subtitle row collapses (no empty space). */
export function EditorialMasthead({
  venue,
  tagline,
  locationDisplay,
}: {
  venue: Venue
  tagline: string | null
  locationDisplay: string
}) {
  // Venue name treatment: stack the last word on its own line in italic 300.
  // For single-word venue names we just italicize the whole thing — no stack.
  const nameParts = venue.name.trim().split(/\s+/)
  const head = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
  const tail = nameParts.slice(-1)[0]

  const subtitleParts: string[] = []
  if (tagline && tagline.trim()) subtitleParts.push(tagline.trim())
  if (locationDisplay && locationDisplay.trim()) {
    subtitleParts.push(locationDisplay.trim().toUpperCase())
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

      {subtitleParts.length > 0 && (
        <div
          style={{
            marginTop: 14,
            fontFamily: T.sans,
            fontSize: 9.5,
            letterSpacing: 2.6,
            color: T.muted,
            fontWeight: 600,
          }}
        >
          {subtitleParts.join('  ·  ')}
        </div>
      )}
    </div>
  )
}
