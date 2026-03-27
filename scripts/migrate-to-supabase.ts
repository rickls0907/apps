/**
 * SpredX Ad Studio — MySQL → Supabase Migration
 *
 * Usage:
 *   1. Hit https://vibe.spredx.com/ad-studio/export-data.php?key=migrate-spredx-2026
 *      and save the response as scripts/export.json
 *   2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   3. Run: npm run migrate
 *   4. Delete export.json and export-data.php when done
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExportData {
  clients: Record<string, unknown>[]
  campaigns: Record<string, unknown>[]
  creatives: Record<string, unknown>[]
  feedback: Record<string, unknown>[]
}

async function uploadImageFromUrl(url: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) { console.warn(`  ⚠ Image fetch failed (${res.status}): ${url}`); return null }
    const buffer = Buffer.from(await res.arrayBuffer())
    const mime = res.headers.get('content-type') ?? 'image/png'
    const { error } = await supabase.storage.from('ad-images').upload(path, buffer, { contentType: mime, upsert: true })
    if (error) { console.warn(`  ⚠ Upload failed: ${error.message}`); return null }
    const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(path)
    return publicUrl
  } catch (e) {
    console.warn(`  ⚠ Image error: ${e}`)
    return null
  }
}

async function migrate() {
  const exportPath = path.join(__dirname, 'export.json')
  if (!fs.existsSync(exportPath)) {
    console.error('❌ export.json not found. See usage instructions above.')
    process.exit(1)
  }

  const data: ExportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
  console.log(`📦 Loaded export: ${data.clients.length} clients, ${data.campaigns.length} campaigns, ${data.creatives.length} creatives, ${data.feedback.length} feedback items\n`)

  // ID maps (MySQL int → Supabase UUID)
  const clientMap: Record<number, string> = {}
  const campaignMap: Record<number, string> = {}
  const creativeMap: Record<number, string> = {}

  // ── 1. Clients ────────────────────────────────────────────
  console.log('🔷 Migrating clients...')
  for (const c of data.clients) {
    const { data: inserted, error } = await supabase
      .from('ad_clients')
      .insert({
        name:                    c.name,
        slug:                    c.slug,
        website_url:             c.website_url ?? null,
        facebook_url:            c.facebook_url ?? null,
        instagram_url:           c.instagram_url ?? null,
        site_context:            c.site_context ?? null,
        site_context_fetched_at: c.site_context_fetched_at ?? null,
        strategy_notes:          c.strategy_notes ?? null,
        notify_emails:           c.notify_emails ?? null,
        created_at:              c.created_at,
        updated_at:              c.updated_at,
      })
      .select('id')
      .single()

    if (error) { console.error(`  ❌ Client "${c.name}": ${error.message}`); continue }
    clientMap[c.id as number] = inserted.id
    console.log(`  ✓ ${c.name} → ${inserted.id}`)
  }

  // ── 2. Campaigns ──────────────────────────────────────────
  console.log('\n🔷 Migrating campaigns...')
  for (const cam of data.campaigns) {
    const clientUuid = clientMap[cam.client_id as number]
    if (!clientUuid) { console.warn(`  ⚠ No client for campaign "${cam.name}"`); continue }

    let clientContext = null
    if (cam.client_context) {
      try { clientContext = JSON.parse(cam.client_context as string) } catch { clientContext = null }
    }

    const { data: inserted, error } = await supabase
      .from('ad_campaigns')
      .insert({
        client_id:            clientUuid,
        client_name:          cam.client_name,
        client_slug:          cam.client_slug,
        name:                 cam.name,
        platform:             cam.platform,
        status:               cam.status,
        review_token:         cam.review_token,
        strategy_notes:       cam.strategy_notes ?? null,
        client_context:       clientContext,
        context_submitted_at: cam.context_submitted_at ?? null,
        created_at:           cam.created_at,
        updated_at:           cam.updated_at,
      })
      .select('id')
      .single()

    if (error) { console.error(`  ❌ Campaign "${cam.name}": ${error.message}`); continue }
    campaignMap[cam.id as number] = inserted.id
    console.log(`  ✓ ${cam.name} → ${inserted.id}`)
  }

  // ── 3. Creatives + Images ─────────────────────────────────
  console.log('\n🔷 Migrating creatives + images...')
  for (const cr of data.creatives) {
    const campaignUuid = campaignMap[cr.campaign_id as number]
    if (!campaignUuid) { console.warn(`  ⚠ No campaign for creative ${cr.id}`); continue }

    // Migrate images to Supabase Storage
    const newImages: Record<string, string> = {}
    const imageUrls = cr.image_urls as Record<string, string> ?? {}
    for (const [orient, url] of Object.entries(imageUrls)) {
      if (!url) continue
      console.log(`    📸 Uploading ${orient} image...`)
      const ext = url.endsWith('.jpg') ? 'jpg' : 'png'
      const storagePath = `${campaignUuid}/${cr.id}-${orient}.${ext}`
      const newUrl = await uploadImageFromUrl(url, storagePath)
      if (newUrl) newImages[orient] = newUrl
    }

    let orientations: string[] = []
    try { orientations = JSON.parse(cr.orientations as string ?? '[]') } catch { orientations = [] }

    let imagePrompts: Record<string, string> = {}
    try { imagePrompts = JSON.parse(cr.image_prompts as string ?? '{}') } catch { imagePrompts = {} }

    const { data: inserted, error } = await supabase
      .from('ad_creatives')
      .insert({
        campaign_id:   campaignUuid,
        sort_order:    cr.sort_order,
        primary_text:  cr.primary_text ?? null,
        headline:      cr.headline ?? null,
        description:   cr.description ?? null,
        cta:           cr.cta,
        images:        newImages,
        image_prompts: imagePrompts,
        orientations,
        status:        cr.status,
        created_at:    cr.created_at,
        updated_at:    cr.updated_at,
      })
      .select('id')
      .single()

    if (error) { console.error(`  ❌ Creative ${cr.id}: ${error.message}`); continue }
    creativeMap[cr.id as number] = inserted.id
    console.log(`  ✓ Creative ${cr.id} → ${inserted.id}`)
  }

  // ── 4. Feedback ───────────────────────────────────────────
  console.log('\n🔷 Migrating feedback...')
  for (const fb of data.feedback) {
    const creativeUuid = creativeMap[fb.creative_id as number]
    if (!creativeUuid) continue

    const { error } = await supabase.from('ad_feedback').insert({
      creative_id:     creativeUuid,
      author_name:     fb.author_name ?? 'Client',
      feedback_type:   fb.feedback_type,
      feedback_target: fb.feedback_target ?? 'general',
      is_internal:     fb.is_internal === 1 || fb.is_internal === true,
      note_text:       fb.note_text ?? null,
      created_at:      fb.created_at,
    })

    if (error) console.warn(`  ⚠ Feedback ${fb.id}: ${error.message}`)
  }

  console.log('\n✅ Migration complete!')
  console.log(`   Clients: ${Object.keys(clientMap).length}`)
  console.log(`   Campaigns: ${Object.keys(campaignMap).length}`)
  console.log(`   Creatives: ${Object.keys(creativeMap).length}`)
  console.log('\n⚠ Remember to:')
  console.log('  - Delete scripts/export.json')
  console.log('  - Delete web/_vibe/ad-studio/export-data.php')
}

migrate().catch(console.error)
