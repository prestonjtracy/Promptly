'use client'

export function formatDisplayName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return value

  return trimmed
    .split(/(\s+|[-/])/)
    .map((part) => {
      if (/^\s+$|^[-/]$/.test(part)) return part
      if (part !== part.toLocaleLowerCase()) return part
      const lower = part.toLocaleLowerCase()
      return lower.charAt(0).toLocaleUpperCase() + lower.slice(1)
    })
    .join('')
}

export function formatEditorialLocationMeta({
  locationDisplay,
  locationCode,
  locationSubhead,
}: {
  locationDisplay: string
  locationCode: string
  locationSubhead: string | null
}): string {
  const subhead = locationSubhead?.trim().replace(/^on\s+/i, '')
  const label = subhead || locationDisplay
  const source = `${label} ${locationCode} ${locationDisplay}`

  if (/\bcart\b/i.test(source)) {
    const cartNumber = extractLastNumber(source)
    return cartNumber ? `CART ${cartNumber.padStart(2, '0')}` : 'CART'
  }

  return subhead
    ? `${subhead.toUpperCase()} ${locationCode.toUpperCase()}`
    : locationDisplay.trim().toUpperCase()
}

function extractLastNumber(value: string): string | null {
  const matches = value.match(/\d+/g)
  return matches?.at(-1) ?? null
}
