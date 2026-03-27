export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: campaign, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: creatives } = await supabase
    .from('ad_creatives')
    .select('*, ad_feedback(id, is_internal)')
    .eq('campaign_id', id)
    .order('sort_order')

  const enriched = (creatives ?? []).map(cr => ({
    ...cr,
    client_feedback_count: cr.ad_feedback?.filter((f: { is_internal: boolean }) => !f.is_internal).length ?? 0,
    team_feedback_count:   cr.ad_feedback?.filter((f: { is_internal: boolean }) => f.is_internal).length ?? 0,
    ad_feedback: undefined,
  }))

  return NextResponse.json({ campaign, creatives: enriched })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const allowed = ['status', 'strategy_notes', 'name', 'platform']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('ad_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/campaigns/[id] — add creative
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { primary_text, headline, description, cta, orientations, images, image_prompts } = body

  // Get next sort_order
  const { data: existing } = await supabase
    .from('ad_creatives')
    .select('sort_order')
    .eq('campaign_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = ((existing?.[0]?.sort_order ?? -1)) + 1

  const { data, error } = await supabase
    .from('ad_creatives')
    .insert({
      campaign_id: id,
      sort_order,
      primary_text: primary_text || null,
      headline: headline || null,
      description: description || null,
      cta: cta || 'learn_more',
      orientations: orientations ?? [],
      images: images ?? {},
      image_prompts: image_prompts ?? {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
