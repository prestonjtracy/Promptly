/**
 * Editorial chassis design tokens.
 *
 * Mirror the EDITORIAL_TOKENS from the Claude Design handoff one-for-one.
 * Colors are static; fonts reference the CSS variables defined by next/font
 * in the order-route layout (see app/order/[venueSlug]/layout.tsx).
 *
 * The chassis's only accent color comes from the venue (primary_color), used
 * exclusively on the sticky CTA, the modifier-radio dot, and the confirmation
 * check ornament. Everything else is the cool ink-on-paper palette below.
 */
export const EDITORIAL_TOKENS = {
  // Color
  ink: '#15110d',
  inkSoft: '#3a342e',
  paper: '#fbfaf6',
  paperDeep: '#f4f1e9',
  muted: '#7a716a',
  mutedSoft: '#a39a91',
  rule: 'rgba(21,17,13,0.18)',
  ruleSoft: 'rgba(21,17,13,0.10)',

  // Type stacks. The `--font-newsreader` and `--font-inter` CSS variables
  // come from the order-route layout's next/font calls.
  serifDisplay:
    "var(--font-newsreader), 'Newsreader', 'Fraunces', Georgia, serif",
  serif: "var(--font-newsreader), 'Newsreader', 'Lora', Georgia, serif",
  sans: "var(--font-inter), 'Inter', -apple-system, system-ui, sans-serif",
} as const

export type EditorialTokens = typeof EDITORIAL_TOKENS
