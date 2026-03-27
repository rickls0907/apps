export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, creative_id, feedback_type, feedback_target = 'general', author_name = 'Client', note_text, is_internal = false } = body

  if (!token || !creative_id || !feedback_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify token belongs to a campaign that has this creative
  const { data: creative } = await supabase
    .from('ad_creatives')
    .select('id, campaign_id')
    .eq('id', creative_id)
    .single()

  if (!creative) return NextResponse.json({ error: 'Creative not found' }, { status: 404 })

  const { data: campaign } = await supabase
    .from('ad_campaigns')
    .select('id, review_token')
    .eq('id', creative.campaign_id)
    .single()

  if (!campaign || campaign.review_token !== token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  const { error } = await supabase.from('ad_feedback').insert({
    creative_id,
    author_name: author_name || 'Client',
    feedback_type,
    feedback_target,
    is_internal,
    note_text: note_text || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update creative status if approve/revision
  if (feedback_type === 'approve') {
    await supabase.from('ad_creatives').update({ status: 'approved' }).eq('id', creative_id)
  } else if (feedback_type === 'revision') {
    await supabase.from('ad_creatives').update({ status: 'revision' }).eq('id', creative_id)
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const creative_id = req.nextUrl.searchParams.get('creative_id')
  if (!creative_id) return NextResponse.json({ error: 'creative_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('ad_feedback')
    .select('*')
    .eq('creative_id', creative_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
