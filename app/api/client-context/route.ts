import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { token, context } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: campaign, error } = await supabase
    .from('ad_campaigns')
    .update({ client_context: context, context_submitted_at: new Date().toISOString() })
    .eq('review_token', token)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, campaign_id: campaign.id })
}
