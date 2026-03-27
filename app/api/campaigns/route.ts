export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const client_id = req.nextUrl.searchParams.get('client_id')
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('ad_campaigns')
    .select(`*, ad_creatives(id, status), ad_feedback:ad_creatives(ad_feedback(id, is_internal))`)
    .eq('client_id', client_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const campaigns = (data ?? []).map(cam => {
    const creatives = cam.ad_creatives ?? []
    const feedbacks = (cam.ad_feedback ?? []).flatMap((cr: { ad_feedback: { is_internal: boolean }[] }) => cr.ad_feedback ?? [])
    return {
      ...cam,
      ad_creatives: undefined,
      ad_feedback: undefined,
      creative_count: creatives.length,
      approved_count: creatives.filter((cr: { status: string }) => cr.status === 'approved').length,
      feedback_count: feedbacks.filter((f: { is_internal: boolean }) => !f.is_internal).length,
    }
  })

  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id, name, platform, strategy_notes } = body

  if (!client_id || !name?.trim()) {
    return NextResponse.json({ error: 'client_id and name are required' }, { status: 400 })
  }

  const { data: client } = await supabase
    .from('ad_clients')
    .select('name, slug')
    .eq('id', client_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const review_token = crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabase
    .from('ad_campaigns')
    .insert({
      client_id,
      client_name: client.name,
      client_slug: client.slug,
      name: name.trim(),
      platform: platform || 'both',
      strategy_notes: strategy_notes || null,
      review_token,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
