import { Newsreader, Inter } from 'next/font/google'

// Editorial chassis typeface: Newsreader. Italic 300 is the chassis's
// signature display weight; 400/500/600 covers everything else. Variable
// font subset is `latin`.
//
// next/font rejects combining an explicit `weight: [...]` array with the
// `axes` option on a variable font, so we list weights explicitly and skip
// the `opsz` axis. The chassis renders correctly at the sizes it uses
// (12–56px) without the optical-size axis; revisit if we ever need
// finer-grained typographic control at extreme sizes.
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-newsreader',
})

// Inter is the chassis's only sans face — used exclusively for the tracked-out
// micro-caps labels (folio, section deck subhead, CTA right-side metadata).
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

/**
 * Order-route layout. Applies the Editorial chassis font variables to the
 * order page tree — both /order/[venueSlug] (the cart flow) and the
 * /order/[venueSlug]/success route inherit the variables, but the success
 * route doesn't reference them today, so it renders unchanged.
 *
 * The variables are exposed as CSS custom properties so any future chassis
 * (e.g. Modern) can either reuse them or override locally without touching
 * <html> or the root layout.
 */
export default function OrderRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${newsreader.variable} ${inter.variable}`}>
      {children}
    </div>
  )
}
