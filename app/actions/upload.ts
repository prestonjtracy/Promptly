'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminVenueId } from '@/app/actions/admin'

const BUCKET = 'request-images'

export async function uploadRequestImage(
  formData: FormData,
  venueId: string
): Promise<{ url: string } | { error: string }> {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided.' }

  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image.' }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Image must be under 5MB.' }
  }

  const supabase = await createClient()

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${venueId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return { error: 'Failed to upload image.' }
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return { url: urlData.publicUrl }
}
