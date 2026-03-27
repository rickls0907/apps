import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://placeholder.supabase.co'
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY  || 'placeholder'
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// Server-side client (full access — never expose to browser)
export const supabase = createClient(url, key)

// Browser-safe client (anon key)
export const supabasePublic = createClient(url, anon)

export async function uploadImage(
  bucket: string,
  path: string,
  data: Buffer | Uint8Array,
  contentType = 'image/png'
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}
