import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = await createClient()

  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('code, name')
    .limit(5)

  const { data: venues, error: venueError } = await supabase
    .from('venues')
    .select('name, slug')
    .limit(5)

  return NextResponse.json({
    env: { hasUrl, hasKey },
    locations: locError ? { error: locError.message } : locations,
    venues: venueError ? { error: venueError.message } : venues,
  })
}
