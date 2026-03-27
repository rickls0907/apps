import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: campaign, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('review_token', token)
    .single()

  if (error || !campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: creatives } = await supabase
    .from('ad_creatives')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('sort_order')

  // Fetch feedback per creative
  const feedbackMap: Record<string, unknown[]> = {}
  for (const cr of creatives ?? []) {
    const { data: fb } = await supabase
      .from('ad_feedback')
      .select('*')
      .eq('creative_id', cr.id)
      .order('created_at', { ascending: false })
    feedbackMap[cr.id] = fb ?? []
  }

  return NextResponse.json({ campaign, creatives: creatives ?? [], feedback: feedbackMap })
}
