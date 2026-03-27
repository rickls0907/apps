export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('ad_clients')
    .select(`
      *,
      ad_campaigns (
        id, status,
        ad_creatives ( id, status )
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute stats
  const clients = data.map(c => {
    const campaigns = c.ad_campaigns ?? []
    const creatives = campaigns.flatMap((cam: { ad_creatives: { status: string }[] }) => cam.ad_creatives ?? [])
    const latest = campaigns[0]
    return {
      ...c,
      ad_campaigns: undefined,
      campaign_count: campaigns.length,
      total_creatives: creatives.length,
      approved_creatives: creatives.filter((cr: { status: string }) => cr.status === 'approved').length,
      latest_campaign: latest?.id ?? null,
      latest_status: latest?.status ?? null,
    }
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, website_url, facebook_url, instagram_url, strategy_notes, notify_emails } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data, error } = await supabase
    .from('ad_clients')
    .insert({ name: name.trim(), slug, website_url: website_url || null, facebook_url: facebook_url || null, instagram_url: instagram_url || null, strategy_notes: strategy_notes || null, notify_emails: notify_emails || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
