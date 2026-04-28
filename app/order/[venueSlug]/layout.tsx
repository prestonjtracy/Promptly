import { Newsreader, Inter } from 'next/font/google'

// Editorial chassis typeface: Newsreader. Loaded with the optical-size axis
// so the magazine-display sizes (38–56px) and body-text sizes (12–18px) both
// render with their intended optical metrics. Italic 300 is the chassis's
// signature display weight; 400/500/600 covers everything else. Variable
// font subset is `latin`.
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
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
